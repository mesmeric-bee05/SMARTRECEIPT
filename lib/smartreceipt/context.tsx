import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import { buildAnalyticsForReceipt } from "./engine";
import { clearLocalState, loadLocalState, persistLocalState } from "./repository";
import type { AnomalyStatus, Receipt, SmartReceiptState } from "./types";
import { nowIso, seedState } from "./types";

interface SmartReceiptContextValue {
  state: SmartReceiptState;
  hydrated: boolean;
  storageIssue: string | null;
  addReceipt: (receipt: Receipt) => Promise<void>;
  saveDraft: (receipt: Receipt) => Promise<void>;
  updateReceipt: (receipt: Receipt) => Promise<void>;
  setAnomalyStatus: (anomalyId: string, status: AnomalyStatus) => Promise<void>;
  setSettings: (patch: Partial<SmartReceiptState["settings"]>) => Promise<void>;
  archiveReceipt: (receiptId: string) => Promise<void>;
  restoreReceipt: (receiptId: string) => Promise<void>;
  resetLocalData: () => Promise<void>;
}

const SmartReceiptContext = createContext<SmartReceiptContextValue | null>(null);

const receiptStatusFromWarnings = (receipt: Receipt): Receipt["status"] => (receipt.warnings.length ? "flagged" : "verified");

export function SmartReceiptProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SmartReceiptState>(() => seedState());
  const [hydrated, setHydrated] = useState(false);
  const [storageIssue, setStorageIssue] = useState<string | null>(null);
  const stateRef = useRef(state);
  const writeQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    loadLocalState().then((result) => {
      if (!active) return;
      stateRef.current = result.state;
      setState(result.state);
      setStorageIssue(result.recoveredFromCorruption ? "Stored ledger data could not be read safely. A fresh local ledger was opened; the quarantined copy remains on this device." : null);
      setHydrated(true);
    }).catch(() => {
      if (!active) return;
      setStorageIssue("Local storage could not be loaded. Changes may not persist until storage is available.");
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  const commit = useCallback((updater: (current: SmartReceiptState) => SmartReceiptState) => {
    const operation = writeQueue.current.then(async () => {
      const next = updater(stateRef.current);
      stateRef.current = next;
      setState(next);
      await persistLocalState(next);
      setStorageIssue(null);
    });
    writeQueue.current = operation.catch(() => undefined);
    return operation;
  }, []);

  const addReceipt = useCallback(async (receipt: Receipt) => {
    await commit((current) => {
      const withoutExisting = current.receipts.filter((candidate) => candidate.id !== receipt.id);
      const analytics = buildAnalyticsForReceipt(receipt, { ...current, receipts: withoutExisting });
      const flaggedWarnings = Array.from(new Set([
        ...receipt.warnings,
        ...analytics.validations.filter((result) => result.status !== "passed").map((result) => result.detail),
        ...analytics.anomalies.map((anomaly) => anomaly.explanation),
        ...analytics.duplicates.map((duplicate) => `Possible duplicate: ${duplicate.reasons.join(", ")}`),
      ]));
      const timestamp = nowIso();
      const nextReceipt: Receipt = {
        ...receipt,
        status: flaggedWarnings.length ? "flagged" : "verified",
        warnings: flaggedWarnings,
        audit: [...receipt.audit, { id: `audit_${Date.now()}`, action: "finalized", label: "Receipt finalized", detail: "Saved locally with validation and analysis results.", createdAt: timestamp }],
        updatedAt: timestamp,
      };
      const newObservations = receipt.items.map((item) => ({
        id: `price_${receipt.id}_${item.id}`,
        productId: item.productId,
        receiptId: receipt.id,
        observedPriceCents: item.unitPriceCents,
        currency: receipt.currency,
        observedAt: receipt.transactionDate,
      }));
      return {
        ...current,
        receipts: [nextReceipt, ...withoutExisting],
        priceObservations: [...newObservations, ...current.priceObservations.filter((observation) => observation.receiptId !== receipt.id)],
        anomalies: [...analytics.anomalies, ...current.anomalies.filter((anomaly) => anomaly.receiptId !== receipt.id)],
        duplicates: [...analytics.duplicates, ...current.duplicates.filter((duplicate) => duplicate.receiptId !== receipt.id)],
        validations: [...analytics.validations, ...current.validations.filter((validation) => validation.receiptId !== receipt.id)],
        lastOpenedAt: timestamp,
      };
    });
  }, [commit]);

  const saveDraft = useCallback(async (receipt: Receipt) => {
    await commit((current) => {
      const existing = current.receipts.find((candidate) => candidate.id === receipt.id);
      const timestamp = nowIso();
      const draft: Receipt = {
        ...receipt,
        status: "review",
        audit: existing ? [...receipt.audit, { id: `audit_${Date.now()}`, action: "edited", label: "Draft updated", detail: "Review changes saved locally.", createdAt: timestamp }] : [...receipt.audit, { id: `audit_${Date.now()}`, action: "created", label: "Draft saved", detail: "Saved locally for later review.", createdAt: timestamp }],
        updatedAt: timestamp,
      };
      return { ...current, receipts: [draft, ...current.receipts.filter((candidate) => candidate.id !== receipt.id)], lastOpenedAt: timestamp };
    });
  }, [commit]);

  const updateReceipt = useCallback(async (receipt: Receipt) => {
    await commit((current) => {
      const previous = current.receipts.find((candidate) => candidate.id === receipt.id);
      const timestamp = nowIso();
      const changed = previous && JSON.stringify({ ...previous, audit: undefined, updatedAt: undefined }) !== JSON.stringify({ ...receipt, audit: undefined, updatedAt: undefined });
      const nextReceipt = changed ? { ...receipt, audit: [...receipt.audit, { id: `audit_${Date.now()}`, action: "edited" as const, label: "Receipt edited", detail: "A reviewed field was corrected by the operator.", createdAt: timestamp }], updatedAt: timestamp } : { ...receipt, updatedAt: timestamp };
      return { ...current, receipts: current.receipts.map((candidate) => candidate.id === receipt.id ? nextReceipt : candidate), lastOpenedAt: timestamp };
    });
  }, [commit]);

  const setAnomalyStatus = useCallback(async (anomalyId: string, status: AnomalyStatus) => {
    await commit((current) => {
      const anomaly = current.anomalies.find((candidate) => candidate.id === anomalyId);
      if (!anomaly) return current;
      const timestamp = nowIso();
      return {
        ...current,
        anomalies: current.anomalies.map((candidate) => candidate.id === anomalyId ? { ...candidate, status } : candidate),
        receipts: current.receipts.map((receipt) => {
          if (receipt.id !== anomaly.receiptId) return receipt;
          const remainingOpen = current.anomalies.some((candidate) => candidate.receiptId === receipt.id && candidate.id !== anomalyId && ["open", "unresolved"].includes(candidate.status));
          const warnings = remainingOpen ? receipt.warnings : receipt.warnings.filter((warning) => warning !== anomaly.explanation);
          return { ...receipt, warnings, status: warnings.length ? "flagged" : receiptStatusFromWarnings({ ...receipt, warnings }), audit: [...receipt.audit, { id: `audit_${Date.now()}`, action: "anomaly_status", label: "Anomaly status updated", detail: `Marked ${status}.`, createdAt: timestamp }], updatedAt: timestamp };
        }),
        lastOpenedAt: timestamp,
      };
    });
  }, [commit]);

  const setSettings = useCallback(async (patch: Partial<SmartReceiptState["settings"]>) => {
    await commit((current) => ({ ...current, settings: { ...current.settings, ...patch }, lastOpenedAt: nowIso() }));
  }, [commit]);

  const archiveReceipt = useCallback(async (receiptId: string) => {
    await commit((current) => {
      const timestamp = nowIso();
      return { ...current, receipts: current.receipts.map((receipt) => receipt.id === receiptId ? { ...receipt, status: "archived", archivedAt: timestamp, audit: [...receipt.audit, { id: `audit_${Date.now()}`, action: "archived", label: "Receipt archived", detail: "Removed from active views; the record remains restorable on this device.", createdAt: timestamp }], updatedAt: timestamp } : receipt), lastOpenedAt: timestamp };
    });
  }, [commit]);

  const restoreReceipt = useCallback(async (receiptId: string) => {
    await commit((current) => {
      const timestamp = nowIso();
      return { ...current, receipts: current.receipts.map((receipt) => receipt.id === receiptId ? { ...receipt, status: receiptStatusFromWarnings(receipt), archivedAt: undefined, audit: [...receipt.audit, { id: `audit_${Date.now()}`, action: "restored", label: "Receipt restored", detail: "Returned to the active local ledger.", createdAt: timestamp }], updatedAt: timestamp } : receipt), lastOpenedAt: timestamp };
    });
  }, [commit]);

  const resetLocalData = useCallback(async () => {
    await clearLocalState();
    const fresh = seedState();
    stateRef.current = fresh;
    setState(fresh);
    await persistLocalState(fresh);
    setStorageIssue(null);
  }, []);

  const value = useMemo(() => ({ state, hydrated, storageIssue, addReceipt, saveDraft, updateReceipt, setAnomalyStatus, setSettings, archiveReceipt, restoreReceipt, resetLocalData }), [state, hydrated, storageIssue, addReceipt, saveDraft, updateReceipt, setAnomalyStatus, setSettings, archiveReceipt, restoreReceipt, resetLocalData]);
  return <SmartReceiptContext.Provider value={value}>{children}</SmartReceiptContext.Provider>;
}

export const useSmartReceipt = () => {
  const context = useContext(SmartReceiptContext);
  if (!context) throw new Error("useSmartReceipt must be used inside SmartReceiptProvider");
  return context;
};
