import { describe, expect, it } from "vitest";

import { analyzePrice, calculateReceiptTotal, findDuplicateCandidates, normalizeDate, normalizeText, validateDraft } from "../lib/smartreceipt/engine";
import { seedState } from "../lib/smartreceipt/types";

describe("SmartReceipt domain engine", () => {
  it("normalizes receipt text and dates conservatively", () => {
    expect(normalizeText("  Fresh-Milk 500ml ")).toBe("fresh milk 500ml");
    expect(normalizeDate("24/10/2026")).toBe("2026-10-24");
    expect(validateDraft({ merchant: "Shop", transactionDate: "2026-02-30", currency: "KES", statedTotalCents: 1000, subtotalCents: 1000, taxCents: 0, discountCents: 0, ocrConfidence: 90, items: [] })[0].status).toBe("failed");
  });

  it("fails total and subtotal checks instead of finalizing inconsistent arithmetic", () => {
    const results = validateDraft({ merchant: "Shop", transactionDate: "2026-10-24", currency: "KES", statedTotalCents: 9999, subtotalCents: 2500, taxCents: 0, discountCents: 0, ocrConfidence: 90, items: [{ id: "1", productId: "p", rawDescription: "Rice", normalizedDescription: "rice", quantity: 2, unitPriceCents: 1000, lineTotalCents: 2000, confidence: 90 }] });
    expect(results.find((result) => result.checkType === "subtotal")?.status).toBe("failed");
    expect(results.find((result) => result.checkType === "total")?.status).toBe("failed");
  });

  it("calculates line totals with tax and discount", () => {
    expect(calculateReceiptTotal([{ id: "1", productId: "p", rawDescription: "Rice", normalizedDescription: "rice", quantity: 2, unitPriceCents: 2500, lineTotalCents: 5000, confidence: 90 }], 500, 100)).toBe(5400);
  });

  it("returns insufficient history instead of inventing an anomaly", () => {
    const result = analyzePrice([1000, 1050], 1800, "KES", "Rice");
    expect(result.method).toBe("insufficient");
    expect(result.severity).toBe("info");
  });

  it("explains a robust price warning when enough history exists", () => {
    const result = analyzePrice([1000, 1010, 990, 1005, 995, 1000], 1400, "KES", "Rice");
    expect(result.method).toBe("mad");
    expect(result.severity).toBe("high");
    expect(result.explanation).toContain("Rice");
  });

  it("returns reasons for a likely duplicate instead of rejecting it", () => {
    const state = seedState();
    const existing = state.receipts[0];
    const candidate = { ...existing, id: "new_receipt", imageUri: existing.imageUri };
    const matches = findDuplicateCandidates(candidate, [existing]);
    expect(matches).toHaveLength(1);
    expect(matches[0].reasons.length).toBeGreaterThan(1);
    expect(matches[0].status).toBe("open");
  });
});
