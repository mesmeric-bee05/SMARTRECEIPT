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
  `${currency} ${new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((Number.isFinite(cents) ? cents : 0) / 100)}`;

export const normalizeText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

export const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

export const normalizeDate = (value: string) => {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if (!match) return trimmed;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const validMoney = (value: number) => Number.isFinite(value) && value >= 0;

export const calculateLineTotal = (item: Pick<ReceiptItem, "quantity" | "unitPriceCents">) =>
  Math.round(item.quantity * item.unitPriceCents);

export const calculateReceiptSubtotal = (items: ReceiptItem[]) =>
  items.reduce((sum, item) => sum + calculateLineTotal(item), 0);

export const calculateReceiptTotal = (items: ReceiptItem[], taxCents: number, discountCents: number) =>
  calculateReceiptSubtotal(items) + (Number.isFinite(taxCents) ? taxCents : 0) - (Number.isFinite(discountCents) ? discountCents : 0);

export const validateDraft = (draft: ReceiptDraft): ValidationResult[] => {
  const subtotal = calculateReceiptSubtotal(draft.items);
  const total = calculateReceiptTotal(draft.items, draft.taxCents, draft.discountCents);
  const totalDelta = Math.abs(total - draft.statedTotalCents);
  const subtotalDelta = Math.abs(subtotal - draft.subtotalCents);
  const requiredFieldsPass = Boolean(draft.merchant.trim() && isValidDate(normalizeDate(draft.transactionDate)) && /^[A-Z]{3}$/.test(draft.currency.trim().toUpperCase()) && draft.items.length);
  const numericFieldsPass = [draft.statedTotalCents, draft.subtotalCents, draft.taxCents, draft.discountCents, draft.ocrConfidence].every(validMoney) && draft.items.every((item) => validMoney(item.quantity) && item.quantity > 0 && validMoney(item.unitPriceCents) && item.unitPriceCents > 0);
  const tolerance = 100;
  return [
    {
      id: createId("validation"),
      receiptId: "draft",
      checkType: "required_fields",
      status: requiredFieldsPass && numericFieldsPass ? "passed" : "failed",
      label: "Required fields",
      detail: requiredFieldsPass && numericFieldsPass ? "Merchant, valid date, currency, totals, and positive line items are present." : "Add a merchant, valid date, three-letter currency, non-negative totals, and positive line items.",
    },
    {
      id: createId("validation"),
      receiptId: "draft",
      checkType: "subtotal",
      expectedCents: draft.subtotalCents,
      actualCents: subtotal,
      differenceCents: subtotalDelta,
      status: subtotalDelta <= tolerance ? "passed" : "failed",
      label: "Subtotal consistency",
      detail: subtotalDelta <= tolerance ? "Line items agree with the stated subtotal." : `Line items differ from the stated subtotal by ${formatMoney(subtotalDelta, draft.currency)}.`,
    },
    {
      id: createId("validation"),
      receiptId: "draft",
      checkType: "total",
      expectedCents: draft.statedTotalCents,
      actualCents: total,
      differenceCents: totalDelta,
      status: totalDelta <= tolerance ? "passed" : "failed",
      label: "Total consistency",
      detail: totalDelta <= tolerance ? `Calculated total is within the ${formatMoney(tolerance, draft.currency)} review tolerance.` : `Calculated total differs by ${formatMoney(totalDelta, draft.currency)}. Correct the fields before finalizing.`,
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
  const cleanHistory = history.filter((value) => Number.isFinite(value) && value >= 0);
  if (cleanHistory.length < 5) {
    const baseline = cleanHistory.length ? median(cleanHistory) : observed;
    return {
      observedPriceCents: observed,
      expectedPriceCents: baseline,
      score: 0,
      threshold: 2.5,
      sampleSize: cleanHistory.length,
      method: "insufficient",
      severity: "info",
      explanation: `${productName} has ${cleanHistory.length} prior observation${cleanHistory.length === 1 ? "" : "s"}; keep collecting prices before raising an alert.`,
    };
  }
  const center = median(cleanHistory);
  const deviation = mad(cleanHistory, center);
  if (deviation === 0) {
    const relative = center ? Math.abs(observed - center) / center : 0;
    return {
      observedPriceCents: observed,
      expectedPriceCents: center,
      score: relative * 100,
      threshold: 5,
      sampleSize: cleanHistory.length,
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
    sampleSize: cleanHistory.length,
    method: "mad",
    severity: absolute > 4 ? "high" : absolute > 3 ? "medium" : "low",
    explanation: `${productName} is ${observed >= center ? "above" : "below"} its median baseline of ${formatMoney(center, currency)} across ${cleanHistory.length} prior observations.`,
  };
};

const imageSignal = (uri?: string) => {
  if (!uri || !/^(file|content|ph|local):\/\//i.test(uri)) return "none";
  return uri.trim();
};

export const findDuplicateCandidates = (receipt: Receipt, existing: Receipt[]): DuplicateCandidate[] => {
  return existing.filter((candidate) => candidate.status !== "archived").flatMap((candidate) => {
    const reasons: string[] = [];
    const sameMerchant = normalizeText(receipt.merchant) === normalizeText(candidate.merchant);
    const sameTotal = receipt.statedTotalCents === candidate.statedTotalCents;
    const receiptDate = new Date(`${receipt.transactionDate}T00:00:00Z`).getTime();
    const candidateDate = new Date(`${candidate.transactionDate}T00:00:00Z`).getTime();
    const dateDistance = Number.isFinite(receiptDate) && Number.isFinite(candidateDate) ? Math.abs(receiptDate - candidateDate) / 86_400_000 : Number.POSITIVE_INFINITY;
    const sameImageSignal = imageSignal(receipt.imageUri) !== "none" && imageSignal(receipt.imageUri) === imageSignal(candidate.imageUri);
    if (sameMerchant) reasons.push("same merchant");
    if (sameTotal) reasons.push("same total");
    if (dateDistance <= 1) reasons.push("date within one day");
    if (sameImageSignal) reasons.push("same local image reference");
    const score = Math.min(1, (sameMerchant ? 0.35 : 0) + (sameTotal ? 0.35 : 0) + (dateDistance <= 1 ? 0.15 : 0) + (sameImageSignal ? 0.15 : 0));
    return score >= 0.65 ? [{ id: createId("duplicate"), receiptId: receipt.id, candidateReceiptId: candidate.id, similarityScore: score, reasons, status: "open" }] : [];
  });
};

export const makeFinalReceipt = (draft: ReceiptDraft): Receipt => {
  const createdAt = nowIso();
  const total = calculateReceiptTotal(draft.items, draft.taxCents, draft.discountCents);
  const normalizedDate = normalizeDate(draft.transactionDate);
  const normalizedCurrency = draft.currency.trim().toUpperCase();
  return {
    id: createId("receipt"),
    merchant: draft.merchant.trim(),
    transactionDate: normalizedDate,
    currency: normalizedCurrency,
    statedTotalCents: Math.max(0, Math.round(draft.statedTotalCents)),
    subtotalCents: Math.max(0, Math.round(draft.subtotalCents)),
    taxCents: Math.max(0, Math.round(draft.taxCents)),
    discountCents: Math.max(0, Math.round(draft.discountCents)),
    calculatedTotalCents: total,
    imageUri: draft.imageUri,
    ocrConfidence: Math.min(100, Math.max(0, draft.ocrConfidence)),
    status: "review",
    items: draft.items.map((item) => ({ ...item, normalizedDescription: normalizeText(item.rawDescription), lineTotalCents: calculateLineTotal(item) })),
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
