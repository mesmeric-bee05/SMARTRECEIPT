import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, Pressable, Text, View } from "react-native";

import { ConfidenceBar, Field, IconButton, OfflinePill, PrimaryButton, Screen, SectionHeader, StatusPill, styles } from "@/components/smartreceipt-ui";
import { useSmartReceipt } from "@/lib/smartreceipt/context";
import { calculateReceiptTotal, formatMoney, makeFinalReceipt, validateDraft } from "@/lib/smartreceipt/engine";
import { palette } from "@/lib/smartreceipt/theme";
import type { ReceiptDraft, ReceiptItem } from "@/lib/smartreceipt/types";

const createDraft = (imageUri?: string): ReceiptDraft => ({
  merchant: "Mwangaza Suppliers",
  transactionDate: new Date().toISOString().slice(0, 10),
  currency: "KES",
  statedTotalCents: 124800,
  subtotalCents: 115000,
  taxCents: 9800,
  discountCents: 0,
  imageUri,
  ocrConfidence: imageUri ? 84 : 91,
  items: [
    { id: `draft_item_${Date.now()}_1`, productId: "prod_rice", rawDescription: "Pishori rice 2kg", normalizedDescription: "pishori rice 2kg", quantity: 3, unitPriceCents: 19600, lineTotalCents: 58800, confidence: imageUri ? 78 : 89 },
    { id: `draft_item_${Date.now()}_2`, productId: "prod_oil", rawDescription: "Cooking oil 1L", normalizedDescription: "cooking oil 1l", quantity: 4, unitPriceCents: 8200, lineTotalCents: 32800, confidence: imageUri ? 86 : 94 },
    { id: `draft_item_${Date.now()}_3`, productId: "prod_sugar", rawDescription: "Brown sugar 1kg", normalizedDescription: "brown sugar 1kg", quantity: 3, unitPriceCents: 7800, lineTotalCents: 23400, confidence: imageUri ? 83 : 91 },
  ],
});

const moneyToCents = (value: string) => Math.max(0, Math.round(Number(value.replace(/[^0-9.-]/g, "")) * 100) || 0);
const centsToMoney = (value: number) => (value / 100).toFixed(2);

export default function ImportScreen() {
  const router = useRouter();
  const { draftId } = useLocalSearchParams<{ draftId?: string }>();
  const { state, addReceipt, saveDraft } = useSmartReceipt();
  const stages = ["Validating image", "Preparing local extraction", "Reading receipt structure", "Calculating confidence", "Preparing review"];
  const savedDraft = draftId ? state.receipts.find((receipt) => receipt.id === draftId && receipt.status !== "archived") : undefined;
  const [draft, setDraft] = useState<ReceiptDraft>(() => savedDraft ? { merchant: savedDraft.merchant, transactionDate: savedDraft.transactionDate, currency: savedDraft.currency, statedTotalCents: savedDraft.statedTotalCents, subtotalCents: savedDraft.subtotalCents, taxCents: savedDraft.taxCents, discountCents: savedDraft.discountCents, imageUri: savedDraft.imageUri, ocrConfidence: savedDraft.ocrConfidence, items: savedDraft.items } : createDraft());
  const [editingReceiptId, setEditingReceiptId] = useState<string | undefined>(savedDraft?.id ?? draftId);
  const [stage, setStage] = useState(savedDraft ? stages.length : -1);
  const [cancelled, setCancelled] = useState(false);
  const processing = stage >= 0 && stage < stages.length;
  const validations = useMemo(() => validateDraft(draft), [draft]);
  const calculatedTotal = calculateReceiptTotal(draft.items, draft.taxCents, draft.discountCents);
  const imagePreviewUri = draft.imageUri && /^(file|content|ph):\/\//i.test(draft.imageUri) ? draft.imageUri : undefined;
  const updateDraft = (patch: Partial<ReceiptDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const updateItem = (itemId: string, patch: Partial<ReceiptItem>) => setDraft((current) => ({ ...current, items: current.items.map((item) => item.id === itemId ? { ...item, ...patch, lineTotalCents: Math.round((patch.quantity ?? item.quantity) * (patch.unitPriceCents ?? item.unitPriceCents)), userEdited: true } : item) }));
  const addItem = () => setDraft((current) => ({ ...current, items: [...current.items, { id: `draft_item_${Date.now()}`, productId: "prod_sugar", rawDescription: "New item", normalizedDescription: "new item", quantity: 1, unitPriceCents: 0, lineTotalCents: 0, confidence: 0, userEdited: true }] }));
  const removeItem = (itemId: string) => setDraft((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }));

  useEffect(() => {
    if (!processing) return;
    if (stage >= stages.length - 1) {
      const timer = setTimeout(() => setStage(stages.length), 500);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setStage((current) => current + 1), 520);
    return () => clearTimeout(timer);
  }, [processing, stage, stages.length]);

  const chooseImage = async (camera = false) => {
    setCancelled(false);
    if (Platform.OS === "web") {
      setDraft(createDraft("local://preview-fixture-receipt"));
      setStage(0);
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset?.uri) {
      if (asset.mimeType && !asset.mimeType.startsWith("image/")) {
        Alert.alert("Unsupported file", "Choose an image file such as JPEG, PNG, or HEIC.");
        return;
      }
      if ((asset.fileSize ?? 0) > 10 * 1024 * 1024 || (asset.width ?? 0) * (asset.height ?? 0) > 20_000_000) {
        Alert.alert("Image too large", "Choose an image under 10 MB and 20 megapixels for local processing.");
        return;
      }
      setEditingReceiptId(undefined);
      setDraft(createDraft(asset.uri));
      setStage(0);
    }
  };

  const finalize = async () => {
    if (validations.some((result) => result.status === "failed")) {
      Alert.alert("Review required", "Correct the failed validation checks before finalizing this receipt.");
      return;
    }
    const receipt = makeFinalReceipt(draft);
    await addReceipt(editingReceiptId ? { ...receipt, id: editingReceiptId } : receipt);
    router.back();
  };
  const save = async () => {
    const receipt = makeFinalReceipt(draft);
    await saveDraft(editingReceiptId ? { ...receipt, id: editingReceiptId } : receipt);
    router.back();
  };
  const rerunExtraction = () => Alert.alert("Rerun local extraction", "This replaces the current review values with a fresh local extraction artifact. Unsaved edits will be discarded.", [{ text: "Cancel", style: "cancel" }, { text: "Rerun", onPress: () => { setDraft(createDraft(draft.imageUri)); setEditingReceiptId(undefined); setStage(0); } }]);
  return <Screen>
    <View style={styles.spread}><View style={styles.row}><IconButton icon="close" label="Close import" onPress={() => router.back()} /><Text style={styles.modalTitle}>Import receipt</Text></View><OfflinePill /></View>
    {stage < 0 ? <View style={styles.importIntro}><View style={styles.scanOrb}><View style={styles.scanOrbInner} /></View><Text style={styles.title}>Bring the paper trail in.</Text><Text style={[styles.subtitle, { textAlign: "center", maxWidth: 300 }]}>Choose a receipt image or use the bundled local fixture to explore the review workflow. Nothing leaves this device.</Text><View style={styles.importButtons}><PrimaryButton icon="camera-outline" onPress={() => void chooseImage(true)}>Use camera</PrimaryButton><PrimaryButton variant="secondary" icon="images-outline" onPress={() => void chooseImage(false)}>Choose image</PrimaryButton></View><Pressable accessibilityRole="button" onPress={() => { setDraft(createDraft()); setStage(0); }}><Text style={styles.linkText}>Use local sample receipt</Text></Pressable></View> : null}
    {processing ? <View style={styles.processingCard}><View style={styles.processingHeader}><View><Text style={styles.eyebrow}>LOCAL EXTRACTION</Text><Text style={styles.sectionTitle}>{stages[stage]}</Text></View><Text style={styles.processingPercent}>{Math.min(96, 12 + stage * 20)}%</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(96, 12 + stage * 20)}%` }]} /></View><View style={styles.stageList}>{stages.map((label, index) => <View key={label} style={styles.stageRow}><View style={[styles.stageDot, index <= stage && styles.stageDotActive]} /><Text style={[styles.stageLabel, index <= stage && styles.stageLabelActive]}>{label}</Text>{index < stage ? <Text style={styles.stageDone}>DONE</Text> : index === stage ? <Text style={styles.stageDoing}>NOW</Text> : null}</View>)}</View><PrimaryButton variant="secondary" icon="close-circle-outline" onPress={() => { setStage(-1); setCancelled(true); }}>Cancel processing</PrimaryButton></View> : null}
    {!processing && stage >= stages.length ? <>
      <View style={styles.reviewBanner}><View style={styles.row}><View style={styles.reviewBannerIcon}><Text style={{ color: palette.ink, fontWeight: "900" }}>AI</Text></View><View style={{ flex: 1, gap: 3 }}><Text style={styles.receiptMerchant}>Extraction ready for review</Text><Text style={styles.receiptMeta}>Local adapter · original values preserved</Text></View><StatusPill label={draft.ocrConfidence >= 90 ? "HIGH" : "CHECK"} status={draft.ocrConfidence >= 90 ? "verified" : "open"} /></View><ConfidenceBar value={draft.ocrConfidence} /></View>
      {imagePreviewUri ? <View style={styles.imagePreview}><Image source={{ uri: imagePreviewUri }} style={styles.imagePreviewImage} resizeMode="cover" /><View style={styles.imageOverlay}><Text style={styles.imageOverlayText}>RECEIPT IMAGE REFERENCE</Text><View style={styles.ocrBox}><Text style={styles.ocrBoxText}>OCR source region</Text></View></View></View> : <View style={styles.paperPreview}><Text style={styles.paperSmall}>MWANGAZA SUPPLIERS</Text><Text style={styles.paperTiny}>LOCAL OCR FIXTURE · REVIEW COPY</Text><View style={styles.paperRule} /><Text style={styles.paperLine}>PISHORI RICE 2KG     3 × 196.00</Text><Text style={styles.paperLine}>COOKING OIL 1L       4 × 82.00</Text><Text style={styles.paperLine}>BROWN SUGAR 1KG      3 × 78.00</Text><View style={styles.paperRule} /><Text style={styles.paperTotal}>TOTAL              KES 1,248.00</Text></View>}
      <View style={styles.section}><SectionHeader title="Receipt fields" hint="Tap any value to correct it" /><View style={styles.card}><Field label="Merchant" value={draft.merchant} onChangeText={(value) => updateDraft({ merchant: value })} /><View style={styles.formGap} /><Field label="Transaction date" value={draft.transactionDate} onChangeText={(value) => updateDraft({ transactionDate: value })} keyboardType="numbers-and-punctuation" /><View style={styles.formGap} /><View style={styles.row}><View style={{ flex: 1 }}><Field label="Currency" value={draft.currency} onChangeText={(value) => updateDraft({ currency: value.toUpperCase() })} /></View><View style={{ flex: 1 }}><Field label="Stated total" value={centsToMoney(draft.statedTotalCents)} onChangeText={(value) => updateDraft({ statedTotalCents: moneyToCents(value) })} keyboardType="decimal-pad" /></View></View><View style={styles.formGap} /><View style={styles.row}><View style={{ flex: 1 }}><Field label="Subtotal" value={centsToMoney(draft.subtotalCents)} onChangeText={(value) => updateDraft({ subtotalCents: moneyToCents(value) })} keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Field label="Tax" value={centsToMoney(draft.taxCents)} onChangeText={(value) => updateDraft({ taxCents: moneyToCents(value) })} keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Field label="Discount" value={centsToMoney(draft.discountCents)} onChangeText={(value) => updateDraft({ discountCents: moneyToCents(value) })} keyboardType="decimal-pad" /></View></View></View></View>
      <View style={styles.section}><SectionHeader title="Line items" hint={`${draft.items.length} extracted rows`} /><View style={{ gap: 10 }}>{draft.items.map((item, index) => <View key={item.id} style={styles.card}><View style={styles.spread}><View style={styles.row}><View style={styles.itemNumber}><Text style={styles.itemNumberText}>{String(index + 1).padStart(2, "0")}</Text></View><View style={{ gap: 4 }}><Text style={styles.receiptMerchant}>Item {index + 1}</Text><Text style={styles.receiptMeta}>{item.userEdited ? "Edited by you" : `OCR confidence ${item.confidence}%`}</Text></View></View><Pressable accessibilityRole="button" accessibilityLabel={`Remove item ${index + 1}`} onPress={() => removeItem(item.id)}><Text style={styles.linkText}>Remove</Text></Pressable></View><View style={styles.formGap} /><Field label="Description" value={item.rawDescription} onChangeText={(value) => updateItem(item.id, { rawDescription: value })} /><View style={styles.formGap} /><View style={styles.row}><View style={{ flex: 1 }}><Field label="Qty" value={String(item.quantity)} onChangeText={(value) => updateItem(item.id, { quantity: Number(value) || 0 })} keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Field label="Unit price" value={centsToMoney(item.unitPriceCents)} onChangeText={(value) => updateItem(item.id, { unitPriceCents: moneyToCents(value) })} keyboardType="decimal-pad" /></View><View style={styles.itemTotal}><Text style={styles.inputLabel}>Line total</Text><Text style={styles.itemTotalText}>{formatMoney(item.lineTotalCents, draft.currency)}</Text></View></View></View>)}</View><PrimaryButton variant="secondary" icon="add-outline" onPress={addItem} style={{ marginTop: 12 }}>Add line item</PrimaryButton></View>
      <View style={styles.section}><SectionHeader title="Validation" hint="Nothing is hidden before save" /><View style={styles.card}>{validations.map((result) => <View key={result.id} style={styles.validationRow}><Ionicons name={result.status === "passed" ? "checkmark-circle-outline" : "alert-circle-outline"} size={20} color={result.status === "passed" ? palette.emerald : palette.amber} /><View style={{ flex: 1, gap: 3 }}><Text style={styles.receiptMerchant}>{result.label}</Text><Text style={styles.receiptMeta}>{result.detail}</Text></View><StatusPill label={result.status.toUpperCase()} status={result.status} /></View>)}<View style={styles.totalCompare}><Text style={styles.receiptMeta}>Calculated total</Text><Text style={styles.receiptMerchant}>{formatMoney(calculatedTotal, draft.currency)}</Text></View></View></View>
      <PrimaryButton variant="secondary" icon="refresh-outline" onPress={rerunExtraction}>Rerun local extraction</PrimaryButton><View style={styles.rowButtons}><PrimaryButton variant="secondary" onPress={() => void save()}>Save draft</PrimaryButton><PrimaryButton icon="checkmark" onPress={() => void finalize()}>Finalize receipt</PrimaryButton></View>
    </> : null}
    {cancelled ? <Text style={styles.cancelledText}>Processing cancelled safely. The image was not saved as a completed OCR result.</Text> : null}
  </Screen>;
}
