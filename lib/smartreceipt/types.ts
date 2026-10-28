export type ReceiptStatus = "draft" | "processing" | "review" | "verified" | "flagged";
export type AnomalyStatus = "open" | "reviewed" | "valid" | "ignored" | "unresolved";
export type DuplicateStatus = "open" | "dismissed" | "confirmed";

export type AuditAction = "created" | "edited" | "finalized" | "archived" | "restored" | "anomaly_status";

export interface AuditEvent {
  id: string;
  action: AuditAction;
  label: string;
  detail: string;
  createdAt: string;
}

export interface ReceiptItem {
  id: string;
  productId: string;
  rawDescription: string;
  normalizedDescription: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  confidence: number;
  userEdited?: boolean;
}

export interface Receipt {
  id: string;
  merchant: string;
  transactionDate: string;
  currency: string;
  statedTotalCents: number;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  calculatedTotalCents: number;
  imageUri?: string;
  ocrConfidence: number;
  status: ReceiptStatus;
  items: ReceiptItem[];
  warnings: string[];
  audit: AuditEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  canonicalName: string;
  category: string;
  aliases: string[];
}

export interface PriceObservation {
  id: string;
  productId: string;
  receiptId: string;
  observedPriceCents: number;
  currency: string;
  observedAt: string;
}

export interface Anomaly {
  id: string;
  receiptId: string;
  itemId: string;
  productId: string;
  observedPriceCents: number;
  expectedPriceCents: number;
  score: number;
  threshold: number;
  sampleSize: number;
  method: "mad" | "relative" | "insufficient";
  severity: "low" | "medium" | "high" | "info";
  explanation: string;
  status: AnomalyStatus;
  createdAt: string;
}

export interface DuplicateCandidate {
  id: string;
  receiptId: string;
  candidateReceiptId: string;
  similarityScore: number;
  reasons: string[];
  status: DuplicateStatus;
}

export interface ValidationResult {
  id: string;
  receiptId: string;
  checkType: "total" | "required_fields";
  expectedCents?: number;
  actualCents?: number;
  differenceCents?: number;
  status: "passed" | "warning" | "failed";
  label: string;
  detail: string;
}

export interface AppSettings {
  displayName: string;
  businessName: string;
  defaultCurrency: string;
  motionReduced: boolean;
  privacyMode: boolean;
  diagnosticsEnabled: boolean;
}

export interface SmartReceiptState {
  receipts: Receipt[];
  products: Product[];
  priceObservations: PriceObservation[];
  anomalies: Anomaly[];
  duplicates: DuplicateCandidate[];
  validations: ValidationResult[];
  settings: AppSettings;
  lastOpenedAt: string;
  schemaVersion: number;
}

export interface ReceiptDraft {
  merchant: string;
  transactionDate: string;
  currency: string;
  statedTotalCents: number;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  imageUri?: string;
  ocrConfidence: number;
  items: ReceiptItem[];
}

export const nowIso = () => new Date().toISOString();

export const createId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const item = (
  id: string,
  productId: string,
  description: string,
  quantity: number,
  unitPriceCents: number,
  confidence = 94,
): ReceiptItem => ({
  id,
  productId,
  rawDescription: description,
  normalizedDescription: description.toLowerCase(),
  quantity,
  unitPriceCents,
  lineTotalCents: Math.round(quantity * unitPriceCents),
  confidence,
});

const audit = (id: string, action: AuditAction, label: string, detail: string, createdAt: string): AuditEvent => ({
  id,
  action,
  label,
  detail,
  createdAt,
});

export const seedState = (): SmartReceiptState => {
  const createdAt = nowIso();
  const products: Product[] = [
    { id: "prod_milk", canonicalName: "Fresh milk 500ml", category: "Dairy", aliases: ["fresh milk", "milk 500ml"] },
    { id: "prod_bread", canonicalName: "White bread 400g", category: "Bakery", aliases: ["bread", "white loaf"] },
    { id: "prod_sugar", canonicalName: "Brown sugar 1kg", category: "Pantry", aliases: ["sugar", "brown sugar"] },
    { id: "prod_rice", canonicalName: "Pishori rice 2kg", category: "Pantry", aliases: ["rice", "pishori"] },
    { id: "prod_oil", canonicalName: "Cooking oil 1L", category: "Pantry", aliases: ["cooking oil", "oil"] },
  ];
  const receipts: Receipt[] = [
    {
      id: "rcpt_101",
      merchant: "Kijiji Wholesale",
      transactionDate: "2026-10-24",
      currency: "KES",
      statedTotalCents: 286500,
      subtotalCents: 264400,
      taxCents: 22100,
      discountCents: 0,
      calculatedTotalCents: 286500,
      ocrConfidence: 96,
      status: "verified",
      items: [
        item("item_101_a", "prod_milk", "Fresh milk 500ml", 12, 6500),
        item("item_101_b", "prod_bread", "White bread 400g", 10, 7800),
        item("item_101_c", "prod_sugar", "Brown sugar 1kg", 8, 7400),
      ],
      warnings: [],
      audit: [audit("audit_101_1", "finalized", "Receipt verified", "Confirmed after review", "2026-10-24T10:18:00.000Z")],
      createdAt: "2026-10-24T10:11:00.000Z",
      updatedAt: "2026-10-24T10:18:00.000Z",
    },
    {
      id: "rcpt_102",
      merchant: "Mwangaza Suppliers",
      transactionDate: "2026-10-18",
      currency: "KES",
      statedTotalCents: 198400,
      subtotalCents: 182800,
      taxCents: 15600,
      discountCents: 0,
      calculatedTotalCents: 198400,
      ocrConfidence: 88,
      status: "flagged",
      items: [
        item("item_102_a", "prod_milk", "Fresh milk 500ml", 10, 6200),
        item("item_102_b", "prod_rice", "Pishori rice 2kg", 5, 21800),
        item("item_102_c", "prod_oil", "Cooking oil 1L", 4, 8300),
      ],
      warnings: ["1 price signal needs review"],
      audit: [audit("audit_102_1", "created", "Review needed", "One item sits outside its usual price range", "2026-10-18T09:40:00.000Z")],
      createdAt: "2026-10-18T09:34:00.000Z",
      updatedAt: "2026-10-18T09:40:00.000Z",
    },
    {
      id: "rcpt_103",
      merchant: "Kijiji Wholesale",
      transactionDate: "2026-10-12",
      currency: "KES",
      statedTotalCents: 154200,
      subtotalCents: 142200,
      taxCents: 12000,
      discountCents: 0,
      calculatedTotalCents: 154200,
      ocrConfidence: 91,
      status: "verified",
      items: [
        item("item_103_a", "prod_milk", "Fresh milk 500ml", 8, 6400),
        item("item_103_b", "prod_bread", "White bread 400g", 8, 7600),
        item("item_103_c", "prod_sugar", "Brown sugar 1kg", 6, 7200),
      ],
      warnings: [],
      audit: [audit("audit_103_1", "finalized", "Receipt verified", "Confirmed after review", "2026-10-12T15:22:00.000Z")],
      createdAt: "2026-10-12T15:16:00.000Z",
      updatedAt: "2026-10-12T15:22:00.000Z",
    },
    {
      id: "rcpt_104",
      merchant: "Mwangaza Suppliers",
      transactionDate: "2026-10-03",
      currency: "KES",
      statedTotalCents: 121800,
      subtotalCents: 112300,
      taxCents: 9500,
      discountCents: 0,
      calculatedTotalCents: 121800,
      ocrConfidence: 84,
      status: "review",
      items: [
        item("item_104_a", "prod_rice", "Pishori rice 2kg", 3, 19600, 76),
        item("item_104_b", "prod_oil", "Cooking oil 1L", 3, 8200, 91),
      ],
      warnings: ["OCR confidence is below 90%"],
      audit: [audit("audit_104_1", "created", "Saved as review", "Low-confidence fields remain open", "2026-10-03T13:08:00.000Z")],
      createdAt: "2026-10-03T13:02:00.000Z",
      updatedAt: "2026-10-03T13:08:00.000Z",
    },
  ];
  const priceSeedRows: Array<[string, number, string, string]> = [
    ["prod_milk", 6200, "2026-10-18", "rcpt_102"],
    ["prod_milk", 6400, "2026-10-12", "rcpt_103"],
    ["prod_milk", 6500, "2026-10-24", "rcpt_101"],
    ["prod_milk", 6300, "2026-09-26", "seed"],
    ["prod_milk", 6400, "2026-09-18", "seed"],
    ["prod_bread", 7800, "2026-10-24", "rcpt_101"],
    ["prod_bread", 7600, "2026-10-12", "rcpt_103"],
    ["prod_bread", 7500, "2026-09-22", "seed"],
    ["prod_bread", 7600, "2026-09-12", "seed"],
    ["prod_sugar", 7400, "2026-10-24", "rcpt_101"],
    ["prod_sugar", 7200, "2026-10-12", "rcpt_103"],
    ["prod_sugar", 7100, "2026-09-22", "seed"],
    ["prod_sugar", 7200, "2026-09-12", "seed"],
    ["prod_rice", 21800, "2026-10-18", "rcpt_102"],
    ["prod_rice", 19600, "2026-10-03", "rcpt_104"],
    ["prod_rice", 19400, "2026-09-22", "seed"],
    ["prod_rice", 19600, "2026-09-12", "seed"],
    ["prod_oil", 8300, "2026-10-18", "rcpt_102"],
    ["prod_oil", 8200, "2026-10-03", "rcpt_104"],
    ["prod_oil", 8100, "2026-09-22", "seed"],
    ["prod_oil", 8050, "2026-09-12", "seed"],
  ];
  const priceObservations: PriceObservation[] = priceSeedRows.map(([productId, observedPriceCents, observedAt, receiptId], index) => ({
    id: `price_seed_${index}`,
    productId,
    observedPriceCents,
    observedAt,
    receiptId,
    currency: "KES",
  }));
  const anomalies: Anomaly[] = [
    {
      id: "anom_001",
      receiptId: "rcpt_102",
      itemId: "item_102_b",
      productId: "prod_rice",
      observedPriceCents: 21800,
      expectedPriceCents: 19500,
      score: 3.2,
      threshold: 2.5,
      sampleSize: 4,
      method: "relative",
      severity: "medium",
      explanation: "Pishori rice 2kg is 11.8% above its recent local baseline of KES 195.00.",
      status: "open",
      createdAt: "2026-10-18T09:40:00.000Z",
    },
  ];
  return {
    receipts,
    products,
    priceObservations,
    anomalies,
    duplicates: [],
    validations: receipts.map((receipt) => ({
      id: `validation_${receipt.id}`,
      receiptId: receipt.id,
      checkType: "total",
      expectedCents: receipt.statedTotalCents,
      actualCents: receipt.calculatedTotalCents,
      differenceCents: Math.abs(receipt.statedTotalCents - receipt.calculatedTotalCents),
      status: "passed",
      label: "Total consistency",
      detail: "Line items, tax, and stated total are aligned.",
    })),
    settings: {
      displayName: "James",
      businessName: "Kijiji Retail",
      defaultCurrency: "KES",
      motionReduced: false,
      privacyMode: false,
      diagnosticsEnabled: false,
    },
    lastOpenedAt: createdAt,
    schemaVersion: 1,
  };
};
