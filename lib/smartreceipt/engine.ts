import type {
  Anomaly,
  DuplicateCandidate,
  Receipt,
  ReceiptDraft,
  ReceiptItem,
  SmartReceiptState,
  ValidationResult,
} from "./types";
import { createId, nowIso } from "./types";

export const formatMoney = (cents: number, currency = "KES") =>
  `${currency} ${new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)}`;

export const normalizeText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

export const normalizeDate = (value: string) => {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if (!match) return trimmed;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

export const calculateReceiptTotal = (items: ReceiptItem[], taxCents: number, discountCents: number) =>
  items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCents), 0) + taxCents - discountCents;

export const validateDraft = (draft: ReceiptDraft): ValidationResult[] => {
  const total = calculateReceiptTotal(draft.items, draft.taxCents, draft.discountCents);
  const delta = Math.abs(total - draft.statedTotalCents);
  const requiredFieldsPass = Boolean(draft.merchant.trim() && draft.transactionDate && draft.currency && draft.items.length);
  return [
    {
      id: createId("validation"),
      receiptId: "draft",
      checkType: "required_fields",
      status: requiredFieldsPass ? "passed" : "failed",
      label: "Required fields",
      detail: requiredFieldsPass ? "Merchant, date, currency, and at least one item are present." : "Add a merchant, date, currency, and at least one line item.",
    },
    {
      id: createId("validation"),
      receiptId: "draft",
      checkType: "total",
      expectedCents: draft.statedTotalCents,
      actualCents: total,
      differenceCents: delta,
      status: delta <= 100 ? "passed" : "warning",
      label: "Total consistency",
      detail: delta <= 100 ? "Calculated total is within the KES 1.00 review tolerance." : `Calculated total differs by ${formatMoney(delta, draft.currency)}.`,
    },
  ];
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

const mad = (values: number[], center: number) => median(values.map((value) => Math.abs(value - center)));

export const analyzePrice = (
  history: number[],
  observed: number,
  currency: string,
  productName: string,
): Omit<Anomaly, "id" | "receiptId" | "itemId" | "productId" | "createdAt" | "status"> => {
  if (history.length < 5) {
    const baseline = history.length ? median(history) : observed;
    return {
      observedPriceCents: observed,
      expectedPriceCents: baseline,
      score: 0,
      threshold: 2.5,
      sampleSize: history.length,
      method: "insufficient",
      severity: "info",
      explanation: `${productName} has ${history.length} prior observation${history.length === 1 ? "" : "s"}; keep collecting prices before raising an alert.`,
    };
  }
  const center = median(history);
  const deviation = mad(history, center);
  if (deviation === 0) {
    const relative = center ? Math.abs(observed - center) / center : 0;
    return {
      observedPriceCents: observed,
      expectedPriceCents: center,
      score: relative * 100,
      threshold: 5,
      sampleSize: history.length,
      method: "relative",
      severity: relative > 0.25 ? "high" : relative > 0.12 ? "medium" : "low",
      explanation: `${productName} usually stays near ${formatMoney(center, currency)}; this observation is ${Math.round(relative * 100)}% away from that baseline.`,
    };
  }
  const score = (0.6745 * (observed - center)) / deviation;
  const absolute = Math.abs(score);
  return {
    observedPriceCents: observed,
    expectedPriceCents: center,
    score,
    threshold: 2.5,
    sampleSize: history.length,
    method: "mad",
    severity: absolute > 4 ? "high" : absolute > 3 ? "medium" : "low",
    explanation: `${productName} is ${observed >= center ? "above" : "below"} its median baseline of ${formatMoney(center, currency)} across ${history.length} prior observations.`,
  };
};

const imageSignal = (uri?: string) => {
  if (!uri) return "none";
  return normalizeText(uri).slice(-32);
};

export const findDuplicateCandidates = (receipt: Receipt, existing: Receipt[]): DuplicateCandidate[] => {
  return existing.flatMap((candidate) => {
    const reasons: string[] = [];
    const sameMerchant = normalizeText(receipt.merchant) === normalizeText(candidate.merchant);
    const sameTotal = receipt.statedTotalCents === candidate.statedTotalCents;
    const dateDistance = Math.abs(new Date(receipt.transactionDate).getTime() - new Date(candidate.transactionDate).getTime()) / 86_400_000;
    const sameImageSignal = imageSignal(receipt.imageUri) !== "none" && imageSignal(receipt.imageUri) === imageSignal(candidate.imageUri);
    if (sameMerchant) reasons.push("same merchant");
    if (sameTotal) reasons.push("same total");
    if (dateDistance <= 1) reasons.push("date within one day");
    if (sameImageSignal) reasons.push("same image reference");
    const score = Math.min(1, (sameMerchant ? 0.35 : 0) + (sameTotal ? 0.35 : 0) + (dateDistance <= 1 ? 0.15 : 0) + (sameImageSignal ? 0.15 : 0));
    return score >= 0.65
      ? [{ id: createId("duplicate"), receiptId: receipt.id, candidateReceiptId: candidate.id, similarityScore: score, reasons, status: "open" }]
      : [];
  });
};

export const makeFinalReceipt = (draft: ReceiptDraft): Receipt => {
  const createdAt = nowIso();
  const total = calculateReceiptTotal(draft.items, draft.taxCents, draft.discountCents);
  return {
    id: createId("receipt"),
    merchant: draft.merchant.trim(),
    transactionDate: normalizeDate(draft.transactionDate),
    currency: draft.currency,
    statedTotalCents: Math.max(0, Math.round(draft.statedTotalCents)),
    subtotalCents: Math.max(0, Math.round(draft.subtotalCents)),
    taxCents: Math.max(0, Math.round(draft.taxCents)),
    discountCents: Math.max(0, Math.round(draft.discountCents)),
    calculatedTotalCents: total,
    imageUri: draft.imageUri,
    ocrConfidence: draft.ocrConfidence,
    status: Math.abs(total - draft.statedTotalCents) > 100 ? "flagged" : "verified",
    items: draft.items.map((item) => ({ ...item, normalizedDescription: normalizeText(item.rawDescription) })),
    warnings: [],
    audit: [{ id: createId("audit"), action: "created", label: "Receipt imported", detail: "Local extraction artifact created for review.", createdAt }],
    createdAt,
    updatedAt: createdAt,
  };
};

export const buildAnalyticsForReceipt = (receipt: Receipt, state: SmartReceiptState) => {
  const validations = validateDraft({
    merchant: receipt.merchant,
    transactionDate: receipt.transactionDate,
    currency: receipt.currency,
    statedTotalCents: receipt.statedTotalCents,
    subtotalCents: receipt.subtotalCents,
    taxCents: receipt.taxCents,
    discountCents: receipt.discountCents,
    imageUri: receipt.imageUri,
    ocrConfidence: receipt.ocrConfidence,
    items: receipt.items,
  }).map((result) => ({ ...result, receiptId: receipt.id }));
  const anomalies: Anomaly[] = receipt.items.flatMap((item) => {
    const product = state.products.find((candidate) => candidate.id === item.productId);
    const history = state.priceObservations
      .filter((observation) => observation.productId === item.productId && observation.currency === receipt.currency && observation.receiptId !== receipt.id)
      .map((observation) => observation.observedPriceCents);
    const analysis = analyzePrice(history, item.unitPriceCents, receipt.currency, product?.canonicalName ?? item.rawDescription);
    return analysis.method !== "insufficient" && Math.abs(analysis.score) >= analysis.threshold
      ? [{ ...analysis, id: createId("anomaly"), receiptId: receipt.id, itemId: item.id, productId: item.productId, createdAt: nowIso(), status: "open" as const }]
      : [];
  });
  return { validations, anomalies, duplicates: findDuplicateCandidates(receipt, state.receipts) };
};
