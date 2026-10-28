import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { buildAnalyticsForReceipt } from "./engine";
import { clearLocalState, loadLocalState, persistLocalState } from "./repository";
import type { AnomalyStatus, Receipt, SmartReceiptState } from "./types";
import { nowIso, seedState } from "./types";

interface SmartReceiptContextValue {
  state: SmartReceiptState;
  hydrated: boolean;
  addReceipt: (receipt: Receipt) => Promise<void>;
  saveDraft: (receipt: Receipt) => Promise<void>;
  updateReceipt: (receipt: Receipt) => Promise<void>;
  setAnomalyStatus: (anomalyId: string, status: AnomalyStatus) => Promise<void>;
  setSettings: (patch: Partial<SmartReceiptState["settings"]>) => Promise<void>;
  archiveReceipt: (receiptId: string) => Promise<void>;
  resetLocalData: () => Promise<void>;
}

const SmartReceiptContext = createContext<SmartReceiptContextValue | null>(null);

export function SmartReceiptProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SmartReceiptState>(() => seedState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadLocalState().then((nextState) => {
      setState(nextState);
      setHydrated(true);
    });
  }, []);

  const commit = useCallback(async (updater: (current: SmartReceiptState) => SmartReceiptState) => {
    setState((current) => {
      const next = updater(current);
      void persistLocalState(next);
      return next;
    });
  }, []);

  const addReceipt = useCallback(async (receipt: Receipt) => {
    await commit((current) => {
      const analytics = buildAnalyticsForReceipt(receipt, current);
      const flaggedWarnings = [
        ...receipt.warnings,
        ...analytics.validations.filter((result) => result.status !== "passed").map((result) => result.detail),
        ...analytics.anomalies.map((anomaly) => anomaly.explanation),
        ...analytics.duplicates.map((duplicate) => `Possible duplicate: ${duplicate.reasons.join(", ")}`),
      ];
      const nextReceipt: Receipt = {
        ...receipt,
        status: flaggedWarnings.length ? "flagged" : "verified",
        warnings: flaggedWarnings,
        audit: [...receipt.audit, { id: `audit_${Date.now()}`, action: "finalized", label: "Receipt finalized", detail: "Saved locally with validation and analysis results.", createdAt: nowIso() }],
        updatedAt: nowIso(),
      };
      const newObservations = receipt.items.map((item) => ({
        id: `price_${item.id}`,
        productId: item.productId,
        receiptId: receipt.id,
        observedPriceCents: item.unitPriceCents,
        currency: receipt.currency,
        observedAt: receipt.transactionDate,
      }));
      return {
        ...current,
        receipts: [nextReceipt, ...current.receipts],
        priceObservations: [...newObservations, ...current.priceObservations],
        anomalies: [...analytics.anomalies, ...current.anomalies],
        duplicates: [...analytics.duplicates, ...current.duplicates],
        validations: [...analytics.validations, ...current.validations],
        lastOpenedAt: nowIso(),
      };
    });
  }, [commit]);

  const saveDraft = useCallback(async (receipt: Receipt) => {
    await commit((current) => ({
      ...current,
      receipts: [{ ...receipt, status: "review", audit: [...receipt.audit, { id: `audit_${Date.now()}`, action: "created", label: "Draft saved", detail: "Saved locally for later review.", createdAt: nowIso() }] }, ...current.receipts],
      lastOpenedAt: nowIso(),
    }));
  }, [commit]);

  const updateReceipt = useCallback(async (receipt: Receipt) => {
    await commit((current) => ({
      ...current,
      receipts: current.receipts.map((candidate) => (candidate.id === receipt.id ? { ...receipt, updatedAt: nowIso() } : candidate)),
      lastOpenedAt: nowIso(),
    }));
  }, [commit]);

  const setAnomalyStatus = useCallback(async (anomalyId: string, status: AnomalyStatus) => {
    await commit((current) => ({
      ...current,
      anomalies: current.anomalies.map((anomaly) => (anomaly.id === anomalyId ? { ...anomaly, status } : anomaly)),
      receipts: current.receipts.map((receipt) => {
        const anomaly = current.anomalies.find((candidate) => candidate.id === anomalyId);
        return anomaly && receipt.id === anomaly.receiptId
          ? { ...receipt, audit: [...receipt.audit, { id: `audit_${Date.now()}`, action: "anomaly_status", label: "Anomaly status updated", detail: `Marked ${status}.`, createdAt: nowIso() }] }
          : receipt;
      }),
    }));
  }, [commit]);

  const setSettings = useCallback(async (patch: Partial<SmartReceiptState["settings"]>) => {
    await commit((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  }, [commit]);

  const archiveReceipt = useCallback(async (receiptId: string) => {
    await commit((current) => ({
      ...current,
      receipts: current.receipts.filter((receipt) => receipt.id !== receiptId),
      anomalies: current.anomalies.filter((anomaly) => anomaly.receiptId !== receiptId),
      duplicates: current.duplicates.filter((duplicate) => duplicate.receiptId !== receiptId && duplicate.candidateReceiptId !== receiptId),
      validations: current.validations.filter((validation) => validation.receiptId !== receiptId),
    }));
  }, [commit]);

  const resetLocalData = useCallback(async () => {
    await clearLocalState();
    const fresh = seedState();
    setState(fresh);
    await persistLocalState(fresh);
  }, []);

  const value = useMemo(() => ({ state, hydrated, addReceipt, saveDraft, updateReceipt, setAnomalyStatus, setSettings, archiveReceipt, resetLocalData }), [state, hydrated, addReceipt, saveDraft, updateReceipt, setAnomalyStatus, setSettings, archiveReceipt, resetLocalData]);
  return <SmartReceiptContext.Provider value={value}>{children}</SmartReceiptContext.Provider>;
}

export const useSmartReceipt = () => {
  const context = useContext(SmartReceiptContext);
  if (!context) throw new Error("useSmartReceipt must be used inside SmartReceiptProvider");
  return context;
};
