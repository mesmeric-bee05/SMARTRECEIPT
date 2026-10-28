import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Platform, Text, View } from "react-native";

import { AppHeader, ConfidenceBar, IconButton, OfflinePill, PrimaryButton, Screen, SectionHeader, StatusPill, styles } from "@/components/smartreceipt-ui";
import { useSmartReceipt } from "@/lib/smartreceipt/context";
import { formatMoney } from "@/lib/smartreceipt/engine";
import { palette, redact, redactMoney } from "@/lib/smartreceipt/theme";

const confirmArchive = (name: string, onConfirm: () => void) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (window.confirm(`Archive ${name}? It will leave the active ledger.`)) onConfirm();
    return;
  }
  Alert.alert("Archive receipt", `Archive ${name}? It will leave the active ledger.`, [{ text: "Cancel", style: "cancel" }, { text: "Archive", style: "destructive", onPress: onConfirm }]);
};

export default function ReceiptDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, archiveReceipt, restoreReceipt } = useSmartReceipt();
  const receipt = state.receipts.find((item) => item.id === id);
  if (!receipt) return <Screen><View style={styles.spread}><IconButton icon="close" label="Close receipt" onPress={() => router.back()} /><OfflinePill /></View><View style={styles.emptyState}><Ionicons name="document-text-outline" size={30} color={palette.amber} /><Text style={styles.sectionTitle}>Receipt not found</Text><Text style={styles.subtitle}>This record may have been archived from the local ledger.</Text></View></Screen>;
  const validations = state.validations.filter((validation) => validation.receiptId === receipt.id);
  const anomalies = state.anomalies.filter((anomaly) => anomaly.receiptId === receipt.id);
  const duplicates = state.duplicates.filter((duplicate) => duplicate.receiptId === receipt.id);
  return <Screen>
    <View style={styles.spread}><IconButton icon="close" label="Close receipt" onPress={() => router.back()} /><OfflinePill /></View>
    <AppHeader title={redact(receipt.merchant, state.settings.privacyMode)} subtitle={`${receipt.transactionDate} · ${receipt.currency}`} action={<StatusPill label={receipt.status.toUpperCase()} status={receipt.status} />} />
    <View style={styles.paperCard}><View style={styles.spread}><View><Text style={styles.paperKicker}>RECEIPT RECORD</Text><Text style={styles.paperMerchant}>{redact(receipt.merchant, state.settings.privacyMode)}</Text></View><Text style={styles.paperDate}>{receipt.transactionDate}</Text></View><View style={styles.paperRule} />{receipt.items.map((item) => <View key={item.id} style={styles.paperItem}><Text style={styles.paperItemDescription}>{redact(item.rawDescription, state.settings.privacyMode)}</Text><Text style={styles.paperItemValue}>{item.quantity} × {redactMoney(formatMoney(item.unitPriceCents, receipt.currency), state.settings.privacyMode)}</Text></View>)}<View style={styles.paperRule} /><View style={styles.spread}><Text style={styles.paperSubtotal}>CALCULATED</Text><Text style={styles.paperSubtotal}>{redactMoney(formatMoney(receipt.calculatedTotalCents, receipt.currency), state.settings.privacyMode)}</Text></View><View style={styles.spread}><Text style={styles.paperTotalLabel}>STATED TOTAL</Text><Text style={styles.paperTotalValue}>{redactMoney(formatMoney(receipt.statedTotalCents, receipt.currency), state.settings.privacyMode)}</Text></View></View>
    <View style={styles.section}><SectionHeader title="Extraction confidence" hint="Confidence assists review; it is not truth" /><View style={styles.card}><View style={styles.spread}><Text style={styles.receiptMerchant}>Local extraction</Text><Text style={styles.receiptMeta}>{Math.round(receipt.ocrConfidence)}%</Text></View><ConfidenceBar value={receipt.ocrConfidence} /></View></View>
    <View style={styles.section}><SectionHeader title="Validation checks" hint="Recorded before finalization" /><View style={styles.card}>{validations.map((validation) => <View key={validation.id} style={styles.validationRow}><Ionicons name={validation.status === "passed" ? "checkmark-circle-outline" : "alert-circle-outline"} size={20} color={validation.status === "passed" ? palette.emerald : palette.amber} /><View style={{ flex: 1, gap: 4 }}><Text style={styles.receiptMerchant}>{validation.label}</Text><Text style={styles.receiptMeta}>{validation.detail}</Text></View><StatusPill label={validation.status.toUpperCase()} status={validation.status} /></View>)}</View></View>
    {anomalies.length ? <View style={styles.section}><SectionHeader title="Price signals" hint="Warnings for human review" /><View style={{ gap: 10 }}>{anomalies.map((anomaly) => <View key={anomaly.id} style={styles.card}><View style={styles.row}><View style={styles.anomalyShape}><Ionicons name="trending-up-outline" size={18} color={palette.amber} /></View><View style={{ flex: 1, gap: 4 }}><Text style={styles.receiptMerchant}>{anomaly.explanation}</Text><Text style={styles.receiptMeta}>Expected {formatMoney(anomaly.expectedPriceCents, receipt.currency)} · score {Math.abs(anomaly.score).toFixed(1)}</Text></View><StatusPill label={anomaly.status.toUpperCase()} status={anomaly.status} /></View></View>)}</View></View> : null}
    {duplicates.length ? <View style={styles.section}><SectionHeader title="Possible duplicate" hint="Not automatically rejected" /><View style={styles.card}>{duplicates.map((duplicate) => <View key={duplicate.id} style={styles.warningRow}><Ionicons name="copy-outline" size={20} color={palette.amber} /><View style={{ flex: 1, gap: 4 }}><Text style={styles.receiptMerchant}>{Math.round(duplicate.similarityScore * 100)}% similarity candidate</Text><Text style={styles.receiptMeta}>{duplicate.reasons.join(" · ")}</Text></View></View>)}</View></View> : null}
    <View style={styles.section}><SectionHeader title="Audit history" hint="Human-in-the-loop record" /><View style={styles.card}>{receipt.audit.map((event) => <View key={event.id} style={styles.auditRow}><View style={styles.auditDot} /><View style={{ flex: 1, gap: 3 }}><Text style={styles.receiptMerchant}>{event.label}</Text><Text style={styles.receiptMeta}>{event.detail}</Text></View><Text style={styles.auditDate}>{event.createdAt.slice(0, 10)}</Text></View>)}</View></View>
    {receipt.status === "review" ? <PrimaryButton icon="create-outline" onPress={() => router.push({ pathname: "/import", params: { draftId: receipt.id } })} style={{ marginTop: 22 }}>Resume review</PrimaryButton> : null}
    {receipt.status === "archived" ? <PrimaryButton variant="secondary" icon="refresh-outline" onPress={() => void restoreReceipt(receipt.id)} style={{ marginTop: 22 }}>Restore receipt</PrimaryButton> : <PrimaryButton variant="danger" icon="archive-outline" onPress={() => confirmArchive(receipt.merchant, () => { void archiveReceipt(receipt.id); router.back(); })} style={{ marginTop: 22 }}>Archive receipt</PrimaryButton>}
  </Screen>;
}
