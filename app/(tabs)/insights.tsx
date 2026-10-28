import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppHeader, ConfidenceBar, EmptyState, MetricCard, OfflinePill, PrimaryButton, Screen, SectionHeader, StatusPill, styles } from "@/components/smartreceipt-ui";
import { useSmartReceipt } from "@/lib/smartreceipt/context";
import { formatMoney } from "@/lib/smartreceipt/engine";
import { palette, redact, redactMoney } from "@/lib/smartreceipt/theme";

export default function InsightsScreen() {
  const router = useRouter();
  const { state, setAnomalyStatus } = useSmartReceipt();
  const [activeAnomaly, setActiveAnomaly] = useState<string | null>(null);
  const activeReceipts = state.receipts.filter((receipt) => receipt.status !== "archived");
  const openAnomalies = state.anomalies.filter((anomaly) => anomaly.status === "open" && activeReceipts.some((receipt) => receipt.id === anomaly.receiptId));
  const verified = activeReceipts.filter((receipt) => receipt.status === "verified").length;
  const productSnapshots = useMemo(() => state.products.map((product) => {
    const observations = state.priceObservations.filter((observation) => observation.productId === product.id);
    const latest = observations[0];
    const prior = observations.slice(1, 5).map((observation) => observation.observedPriceCents);
    const baseline = prior.length ? Math.round(prior.reduce((sum, value) => sum + value, 0) / prior.length) : latest?.observedPriceCents ?? 0;
    const movement = baseline ? ((latest?.observedPriceCents ?? baseline) - baseline) / baseline : 0;
    return { product, observations, latest, movement, baseline };
  }).filter((row) => row.latest), [state.products, state.priceObservations]);
  return <Screen>
    <View style={styles.spread}><OfflinePill /><Pressable accessibilityRole="button" onPress={() => router.push("/import")}><Text style={styles.linkText}>Add observation</Text></Pressable></View>
    <AppHeader title="Insights" subtitle="Signals are explainable, reviewable, and never verdicts." />
    <View style={[styles.row, { gap: 10 }]}><MetricCard label="OPEN SIGNALS" value={String(openAnomalies.length).padStart(2, "0")} detail="Price warnings" tone={openAnomalies.length ? "amber" : "green"} /><MetricCard label="VERIFIED" value={String(verified).padStart(2, "0")} detail="Trusted records" tone="green" /></View>
    <View style={styles.section}><SectionHeader title="Anomaly center" hint="Prioritize what needs a second look" />{openAnomalies.length ? <View style={{ gap: 10 }}>{openAnomalies.map((anomaly) => { const expanded = activeAnomaly === anomaly.id; const receipt = activeReceipts.find((candidate) => candidate.id === anomaly.receiptId); const currency = receipt?.currency ?? state.settings.defaultCurrency; return <View key={anomaly.id} style={styles.card}><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setActiveAnomaly(expanded ? null : anomaly.id)} style={styles.spread}><View style={styles.row}><View style={styles.anomalyShape}><Ionicons name="trending-up-outline" size={18} color={palette.amber} /></View><View style={{ gap: 4, flex: 1 }}><Text style={styles.receiptMerchant}>{redact(state.products.find((product) => product.id === anomaly.productId)?.canonicalName ?? "Product", state.settings.privacyMode)}</Text><Text style={styles.receiptMeta}>{redactMoney(formatMoney(anomaly.observedPriceCents, currency), state.settings.privacyMode)} observed · {anomaly.sampleSize} prior</Text></View></View><StatusPill label={anomaly.severity.toUpperCase()} status={anomaly.severity} /></Pressable>{expanded ? <View style={styles.expandedPanel}><Text style={styles.bodyText}>{state.settings.privacyMode ? "Price signal details hidden in privacy mode." : anomaly.explanation}</Text><View style={styles.spread}><Text style={styles.receiptMeta}>Baseline {redactMoney(formatMoney(anomaly.expectedPriceCents, currency), state.settings.privacyMode)}</Text><Text style={styles.receiptMeta}>Score {Math.abs(anomaly.score).toFixed(1)}</Text></View><View style={styles.rowButtons}><PrimaryButton variant="secondary" onPress={() => void setAnomalyStatus(anomaly.id, "valid")}>Mark valid</PrimaryButton><PrimaryButton variant="secondary" onPress={() => void setAnomalyStatus(anomaly.id, "ignored")}>Ignore</PrimaryButton></View></View> : null}</View>; })}</View> : <EmptyState icon="checkmark-circle-outline" title="No open anomalies" body="Price warnings will appear here when the local ledger has enough evidence." />}</View>
    <View style={styles.section}><SectionHeader title="Price movement" hint="Recent unit-price observations" />{productSnapshots.map(({ product, latest, movement, baseline }) => <View key={product.id} style={styles.card}><View style={styles.spread}><View style={{ flex: 1, gap: 4 }}><Text style={styles.receiptMerchant}>{product.canonicalName}</Text><Text style={styles.receiptMeta}>{product.category} · {latest ? latest.observedAt : "No date"}</Text></View><Text style={[styles.priceMovement, { color: movement > 0.1 ? palette.amber : movement < -0.1 ? palette.blue : palette.emerald }]}>{movement >= 0 ? "+" : ""}{Math.round(movement * 100)}%</Text></View><View style={styles.priceBars}><View style={[styles.priceBar, { height: 18, opacity: 0.35 }]} /><View style={[styles.priceBar, { height: 30, opacity: 0.5 }]} /><View style={[styles.priceBar, { height: 23, opacity: 0.7 }]} /><View style={[styles.priceBar, { height: 38 }]} /></View><View style={styles.spread}><Text style={styles.receiptMeta}>Baseline {formatMoney(baseline, "KES")}</Text><Text style={styles.receiptMeta}>Latest {formatMoney(latest?.observedPriceCents ?? baseline, "KES")}</Text></View></View>)}</View>
    <View style={styles.section}><SectionHeader title="Data confidence" hint="How much of the ledger is ready" /><View style={styles.card}><View style={styles.spread}><Text style={styles.receiptMerchant}>Verified coverage</Text><Text style={styles.receiptMeta}>{activeReceipts.length ? Math.round((verified / activeReceipts.length) * 100) : 0}%</Text></View><ConfidenceBar value={activeReceipts.length ? (verified / activeReceipts.length) * 100 : 0} /></View></View>
  </Screen>;
}
