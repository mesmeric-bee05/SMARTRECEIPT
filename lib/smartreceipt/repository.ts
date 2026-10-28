import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SmartReceiptState } from "./types";
import { nowIso, seedState } from "./types";

const STORAGE_KEY = "smartreceipt.local-state.v1";

export const loadLocalState = async (): Promise<SmartReceiptState> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return seedState();
    const parsed = JSON.parse(stored) as SmartReceiptState;
    return { ...seedState(), ...parsed, lastOpenedAt: nowIso() };
  } catch {
    return seedState();
  }
};

export const persistLocalState = async (state: SmartReceiptState) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearLocalState = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};
