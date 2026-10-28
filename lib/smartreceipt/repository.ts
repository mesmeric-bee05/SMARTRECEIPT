import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Receipt, ReceiptItem, SmartReceiptState } from "./types";
import { nowIso, seedState } from "./types";

export const CURRENT_SCHEMA_VERSION = 2;
const STORAGE_KEY = "smartreceipt.local-state.v2";
const LEGACY_STORAGE_KEY = "smartreceipt.local-state.v1";
const CORRUPT_PREFIX = "smartreceipt.corrupt.";

export interface LoadLocalStateResult {
  state: SmartReceiptState;
  recoveredFromCorruption: boolean;
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const isReceiptItem = (value: unknown): value is ReceiptItem => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ReceiptItem>;
  return Boolean(
    typeof item.id === "string" &&
      typeof item.productId === "string" &&
      typeof item.rawDescription === "string" &&
      typeof item.normalizedDescription === "string" &&
      finite(item.quantity) &&
      finite(item.unitPriceCents) &&
      finite(item.lineTotalCents) &&
      finite(item.confidence),
  );
};

const isReceipt = (value: unknown): value is Receipt => {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<Receipt>;
  return Boolean(
    typeof receipt.id === "string" &&
      typeof receipt.merchant === "string" &&
      typeof receipt.transactionDate === "string" &&
      typeof receipt.currency === "string" &&
      finite(receipt.statedTotalCents) &&
      finite(receipt.subtotalCents) &&
      finite(receipt.taxCents) &&
      finite(receipt.discountCents) &&
      finite(receipt.calculatedTotalCents) &&
      finite(receipt.ocrConfidence) &&
      Array.isArray(receipt.items) &&
      receipt.items.every(isReceiptItem) &&
      Array.isArray(receipt.warnings) &&
      Array.isArray(receipt.audit),
  );
};

const isValidState = (value: unknown): value is SmartReceiptState => {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<SmartReceiptState>;
  return Boolean(
    Array.isArray(state.receipts) &&
      state.receipts.every(isReceipt) &&
      Array.isArray(state.products) &&
      Array.isArray(state.priceObservations) &&
      Array.isArray(state.anomalies) &&
      Array.isArray(state.duplicates) &&
      Array.isArray(state.validations) &&
      state.settings &&
      typeof state.settings === "object" &&
      typeof state.settings.defaultCurrency === "string" &&
      typeof state.lastOpenedAt === "string",
  );
};

const migrateState = (value: SmartReceiptState): SmartReceiptState => ({
  ...value,
  schemaVersion: CURRENT_SCHEMA_VERSION,
  settings: {
    ...seedState().settings,
    ...value.settings,
  },
  lastOpenedAt: nowIso(),
});

export const loadLocalState = async (): Promise<LoadLocalStateResult> => {
  try {
    const stored = (await AsyncStorage.getItem(STORAGE_KEY)) ?? (await AsyncStorage.getItem(LEGACY_STORAGE_KEY));
    if (!stored) return { state: seedState(), recoveredFromCorruption: false };
    const parsed: unknown = JSON.parse(stored);
    if (!isValidState(parsed)) throw new Error("Stored SmartReceipt state failed schema validation");
    const state = migrateState(parsed);
    if (state.schemaVersion !== Number((parsed as SmartReceiptState).schemaVersion)) {
      await persistLocalState(state);
    }
    return { state, recoveredFromCorruption: false };
  } catch (error) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) await AsyncStorage.setItem(`${CORRUPT_PREFIX}${Date.now()}`, raw);
    } catch {
      // Recovery is best effort; never block app startup on storage cleanup.
    }
    return { state: seedState(), recoveredFromCorruption: true };
  }
};

export const persistLocalState = async (state: SmartReceiptState) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, schemaVersion: CURRENT_SCHEMA_VERSION }));
};

export const clearLocalState = async () => {
  await AsyncStorage.multiRemove([STORAGE_KEY, LEGACY_STORAGE_KEY]);
};
