import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { AppHeader, BrandMark, MetricCard, OfflinePill, PrimaryButton, ReceiptRow, Screen, SectionHeader, SignalField, styles } from "@/components/smartreceipt-ui";
import { useSmartReceipt } from "@/lib/smartreceipt/context";
import { formatMoney } from "@/lib/smartreceipt/engine";
import { palette, redact, redactMoney } from "@/lib/smartreceipt/theme";

export default function OverviewScreen() {
  const router = useRouter();
  const { state, hydrated } = useSmartReceipt();
  const activeReceipts = useMemo(() => state.receipts.filter((receipt) => receipt.status !== "archived"), [state.receipts]);
  const monthTotal = useMemo(() => activeReceipts.reduce((sum, receipt) => sum + receipt.statedTotalCents, 0), [activeReceipts]);
  const reviewCount = activeReceipts.filter((receipt) => receipt.status === "review" || receipt.status === "flagged").length;
  const openAnomalies = state.anomalies.filter((anomaly) => anomaly.status === "open");
  const recent = activeReceipts.slice(0, 3);
  if (!hydrated) return <View style={styles.screen}><View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Text style={styles.subtitle}>Loading local ledger…</Text></View></View>;
  return <Screen>
    <View style={styles.spread}><BrandMark /><OfflinePill /></View>
    <AppHeader title={`Good morning, ${redact(state.settings.displayName, state.settings.privacyMode)}.`} subtitle="Your receipt intelligence, quietly working in the background." action={<Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push("/settings")} style={styles.avatar}><Text style={styles.avatarText}>{state.settings.displayName.slice(0, 1).toUpperCase()}</Text></Pressable>} />
    <Pressable accessibilityRole="button" accessibilityLabel="Import a new receipt" onPress={() => router.push("/import")} style={({ pressed }) => [styles.heroAction, pressed && { transform: [{ scale: 0.985 }] }]}>
      <View style={{ flex: 1, gap: 6 }}><Text style={styles.heroEyebrow}>NEXT ACTION</Text><Text style={styles.heroTitle}>Capture a receipt</Text><Text style={styles.heroBody}>Turn paper into a searchable record with a human review step.</Text></View><View style={styles.heroIcon}><Ionicons name="scan-outline" size={26} color={palette.ink} /></View>
    </Pressable>
    <View style={[styles.row, { gap: 10, marginTop: 18 }]}>
      <MetricCard label="LEDGER TOTAL" value={redactMoney(formatMoney(monthTotal, state.settings.defaultCurrency), state.settings.privacyMode)} detail={`${activeReceipts.length} local receipts`} />
      <MetricCard label="REVIEW QUEUE" value={String(reviewCount).padStart(2, "0")} detail={reviewCount ? "Needs your eyes" : "All clear"} tone={reviewCount ? "amber" : "green"} />
    </View>
    <View style={styles.section}><SectionHeader title="Local activity" hint="A calm view of your data rhythm" /><SignalField reducedMotion={state.settings.motionReduced} /><View style={styles.activityLegend}><View style={styles.row}><View style={[styles.legendDot, { backgroundColor: palette.emerald }]} /><Text style={styles.sectionHint}>verified</Text></View><View style={styles.row}><View style={[styles.legendDot, { backgroundColor: palette.amber }]} /><Text style={styles.sectionHint}>review</Text></View><View style={styles.row}><View style={[styles.legendDot, { backgroundColor: palette.red }]} /><Text style={styles.sectionHint}>action needed</Text></View></View></View>
    <View style={styles.section}><SectionHeader title="Review pressure" hint={openAnomalies.length ? `${openAnomalies.length} signal${openAnomalies.length === 1 ? "" : "s"} waiting` : "Nothing urgent"} action={<Pressable accessibilityRole="button" onPress={() => router.push("/insights")}><Text style={styles.linkText}>View insights</Text></Pressable>} /><View style={styles.card}>{openAnomalies.slice(0, 2).map((anomaly) => <View key={anomaly.id} style={styles.warningRow}><View style={styles.warningIcon}><Ionicons name="trending-up-outline" size={18} color={palette.amber} /></View><View style={{ flex: 1, gap: 4 }}><Text style={styles.receiptMerchant}>{anomaly.explanation.split(".")[0]}.</Text><Text style={styles.receiptMeta}>Human review recommended · score {Math.abs(anomaly.score).toFixed(1)}</Text></View></View>)}{!openAnomalies.length ? <View style={styles.clearState}><Ionicons name="checkmark-circle-outline" size={22} color={palette.emerald} /><Text style={styles.subtitle}>Your ledger is calm. New warnings will appear here.</Text></View> : null}</View></View>
    <View style={styles.section}><SectionHeader title="Recent receipts" hint="Latest local records" action={<Pressable accessibilityRole="button" onPress={() => router.push("/receipts")}><Text style={styles.linkText}>See all</Text></Pressable>} /><View style={styles.card}>{recent.map((receipt) => <ReceiptRow key={receipt.id} receipt={receipt} privacyMode={state.settings.privacyMode} onPress={() => router.push({ pathname: "/receipt/[id]", params: { id: receipt.id } })} />)}</View></View>
    <PrimaryButton icon="add" onPress={() => router.push("/import")} style={{ marginTop: 22 }}>Add receipt</PrimaryButton>
  </Screen>;
}
