import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Platform,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { formatMoney } from "@/lib/smartreceipt/engine";
import { palette, spacing, statusTone } from "@/lib/smartreceipt/theme";
import type { Receipt } from "@/lib/smartreceipt/types";

export const styles: any = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xl },
  eyebrow: { fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: palette.textMuted, fontWeight: "700" },
  title: { fontSize: 30, lineHeight: 36, color: palette.text, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 22, padding: spacing.lg },
  paperCard: { backgroundColor: palette.paper, borderRadius: 20, padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center" },
  spread: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  section: { marginTop: spacing.xl, gap: spacing.md },
  sectionTitle: { color: palette.text, fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  sectionHint: { color: palette.textMuted, fontSize: 12 },
  metricValue: { color: palette.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  metricLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
  button: { minHeight: 48, borderRadius: 16, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonPrimary: { backgroundColor: palette.amber },
  buttonPrimaryText: { color: palette.ink, fontWeight: "800", fontSize: 14 },
  buttonSecondary: { backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.border },
  buttonSecondaryText: { color: palette.text, fontWeight: "800", fontSize: 14 },
  buttonDanger: { backgroundColor: palette.redSoft, borderWidth: 1, borderColor: "#6B3539" },
  buttonDangerText: { color: palette.red, fontWeight: "800", fontSize: 14 },
  input: { minHeight: 48, borderRadius: 14, backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 14, color: palette.text, fontSize: 15 },
  inputLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 7 },
});

type IconName = keyof typeof Ionicons.glyphMap;

export function IconButton({ icon, onPress, label, style }: { icon: IconName; onPress: () => void; label: string; style?: ViewStyle }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, style, pressed && { opacity: 0.72 }]}>
      <Ionicons name={icon} size={20} color={palette.text} />
    </Pressable>
  );
}

export function AppHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={styles.eyebrow}>SMARTRECEIPT / LOCAL LEDGER</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Screen({ children, scroll = true, contentStyle }: { children: React.ReactNode; scroll?: boolean; contentStyle?: ViewStyle }) {
  return scroll ? <ScrollView style={styles.screen} contentContainerStyle={[styles.scroll, contentStyle]} showsVerticalScrollIndicator={false}>{children}</ScrollView> : <View style={[styles.screen, contentStyle]}>{children}</View>;
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brandMarkWrap} accessibilityLabel="SmartReceipt local ledger">
      <View style={styles.brandMark}><View style={styles.brandMarkLine} /></View>
      {!compact ? <Text style={styles.brandName}>SMARTRECEIPT</Text> : null}
    </View>
  );
}

export function OfflinePill() {
  return <View style={[styles.pill, { backgroundColor: palette.emeraldSoft }]}><View style={[styles.pillDot, { backgroundColor: palette.emerald }]} /><Text style={[styles.pillText, { color: palette.emerald }]}>LOCAL / OFFLINE</Text></View>;
}

export function StatusPill({ label, status }: { label: string; status: string }) {
  const tone = statusTone(status);
  return <View style={[styles.pill, { backgroundColor: tone.bg }]}><Text style={[styles.pillText, { color: tone.fg }]}>{label}</Text></View>;
}

export function PrimaryButton({ children, variant = "primary", icon, ...props }: PressableProps & { children: React.ReactNode; variant?: "primary" | "secondary" | "danger"; icon?: IconName }) {
  const textStyle = variant === "primary" ? styles.buttonPrimaryText : variant === "danger" ? styles.buttonDangerText : styles.buttonSecondaryText;
  return <Pressable {...props} style={({ pressed }) => [styles.button, variant === "primary" ? styles.buttonPrimary : variant === "danger" ? styles.buttonDanger : styles.buttonSecondary, pressed && { opacity: 0.78 }]}>{icon ? <Ionicons name={icon} size={17} color={textStyle.color} /> : null}<Text style={textStyle}>{children}</Text></Pressable>;
}

export function SectionHeader({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return <View style={styles.spread}><View style={{ gap: 3, flex: 1 }}><Text style={styles.sectionTitle}>{title}</Text>{hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}</View>{action}</View>;
}

export function MetricCard({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail?: string; tone?: "neutral" | "amber" | "green" | "red" }) {
  const color = tone === "amber" ? palette.amber : tone === "green" ? palette.emerald : tone === "red" ? palette.red : palette.text;
  return <View style={[styles.metricCard, { borderTopColor: color }]}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, { color }]}>{value}</Text>{detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}</View>;
}

export function ReceiptRow({ receipt, onPress }: { receipt: Receipt; onPress: () => void }) {
  const tone = statusTone(receipt.status);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open receipt from ${receipt.merchant}`} onPress={onPress} style={({ pressed }) => [styles.receiptRow, pressed && { backgroundColor: palette.surfaceRaised }]}>
    <View style={[styles.receiptIcon, { backgroundColor: tone.bg }]}><Ionicons name={receipt.status === "flagged" ? "alert-circle-outline" : "receipt-outline"} size={20} color={tone.fg} /></View>
    <View style={{ flex: 1, gap: 4 }}><Text style={styles.receiptMerchant} numberOfLines={1}>{receipt.merchant}</Text><Text style={styles.receiptMeta}>{receipt.transactionDate} · {receipt.items.length} items</Text></View>
    <View style={{ alignItems: "flex-end", gap: 5 }}><Text style={styles.receiptAmount}>{formatMoney(receipt.statedTotalCents, receipt.currency)}</Text><StatusPill label={receipt.status === "flagged" ? "REVIEW" : receipt.status.toUpperCase()} status={receipt.status} /></View>
  </Pressable>;
}

export function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 90 ? palette.emerald : value >= 75 ? palette.amber : palette.red;
  return <View style={styles.confidenceWrap}><View style={styles.confidenceTrack}><View style={[styles.confidenceFill, { width: `${Math.max(4, Math.min(100, value))}%`, backgroundColor: color }]} /></View><Text style={[styles.confidenceValue, { color }]}>{Math.round(value)}%</Text></View>;
}

export function SignalField({ active = true, reducedMotion = false }: { active?: boolean; reducedMotion?: boolean }) {
  const [pulse] = useState(() => new Animated.Value(0.6));
  useEffect(() => {
    if (!active || reducedMotion) {
      pulse.setValue(0.6);
      return;
    }
    const useNativeDriver = Platform.OS !== "web";
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver }), Animated.timing(pulse, { toValue: 0.45, duration: 1500, useNativeDriver })]));
    loop.start();
    return () => loop.stop();
  }, [active, pulse, reducedMotion]);
  const dots = Array.from({ length: 22 });
  return <View style={styles.signalField} accessibilityLabel="Local receipt activity visualization"><View style={styles.signalLine} /><Animated.View style={[styles.signalGlow, { opacity: pulse }]} />{dots.map((_, index) => <View key={index} style={[styles.signalDot, { left: `${8 + ((index * 37) % 86)}%`, top: `${20 + ((index * 53) % 58)}%`, backgroundColor: index % 7 === 0 ? palette.amber : index % 5 === 0 ? palette.red : palette.emerald, transform: [{ scale: index % 7 === 0 ? 1.35 : 1 }] }]} />)}</View>;
}

export function Field({ label, value, onChangeText, keyboardType = "default", placeholder, ...props }: TextInputProps & { label: string; value: string; onChangeText: (value: string) => void }) {
  return <View><Text style={styles.inputLabel}>{label}</Text><TextInput {...props} value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholder={placeholder} placeholderTextColor={palette.textFaint} style={styles.input} /></View>;
}

export function LoadingState({ label = "Loading local ledger" }: { label?: string }) {
  return <View style={styles.loadingState}><ActivityIndicator color={palette.amber} /><Text style={styles.subtitle}>{label}</Text></View>;
}

export function EmptyState({ icon = "sparkles-outline", title, body, action }: { icon?: IconName; title: string; body: string; action?: React.ReactNode }) {
  return <View style={styles.emptyState}><Ionicons name={icon} size={30} color={palette.amber} /><Text style={styles.sectionTitle}>{title}</Text><Text style={[styles.subtitle, { textAlign: "center", maxWidth: 280 }]}>{body}</Text>{action}</View>;
}

Object.assign(styles, StyleSheet.create({
  iconButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: palette.amber, alignItems: "center", justifyContent: "center" },
  avatarText: { color: palette.ink, fontSize: 16, fontWeight: "900" },
  heroAction: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: palette.amber, borderRadius: 22, padding: 18 },
  heroEyebrow: { color: "#7D5B2A", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  heroTitle: { color: palette.ink, fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  heroBody: { color: "#705832", fontSize: 13, lineHeight: 18, maxWidth: 250 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.42)", alignItems: "center", justifyContent: "center" },
  activityLegend: { flexDirection: "row", alignItems: "center", gap: 14 },
  legendDot: { width: 7, height: 7, borderRadius: 4, marginRight: 4 },
  linkText: { color: palette.amber, fontSize: 12, fontWeight: "800" },
  warningRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10 },
  warningIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: palette.amberSoft, alignItems: "center", justifyContent: "center" },
  clearState: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, paddingHorizontal: 14, borderRadius: 15, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  searchInput: { flex: 1, color: palette.text, fontSize: 14 },
  filterRail: { flexDirection: "row", gap: 8, marginTop: 12 },
  filterChip: { paddingHorizontal: 14, minHeight: 34, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" },
  filterChipActive: { backgroundColor: palette.amber, borderColor: palette.amber },
  filterChipText: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
  filterChipTextActive: { color: palette.ink },
  modalTitle: { color: palette.text, fontSize: 16, fontWeight: "800", marginLeft: 10 },
  importIntro: { alignItems: "center", paddingTop: 30, gap: 16 },
  scanOrb: { width: 148, height: 148, borderRadius: 74, backgroundColor: palette.amberSoft, borderWidth: 1, borderColor: "#6F512C", alignItems: "center", justifyContent: "center" },
  scanOrbInner: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderColor: palette.amber, backgroundColor: "rgba(244,184,96,0.09)" },
  importButtons: { width: "100%", gap: 10, marginTop: 10 },
  processingCard: { backgroundColor: palette.surface, borderRadius: 22, borderWidth: 1, borderColor: palette.border, padding: 18, gap: 18 },
  processingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  processingPercent: { color: palette.amber, fontSize: 28, fontWeight: "900" },
  progressTrack: { height: 8, backgroundColor: palette.surfaceRaised, borderRadius: 10, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: palette.amber, borderRadius: 10 },
  stageList: { gap: 13 },
  stageRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  stageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.border },
  stageDotActive: { backgroundColor: palette.amber },
  stageLabel: { color: palette.textMuted, fontSize: 13, flex: 1 },
  stageLabelActive: { color: palette.text },
  stageDone: { color: palette.emerald, fontSize: 10, fontWeight: "900" },
  stageDoing: { color: palette.amber, fontSize: 10, fontWeight: "900" },
  reviewBanner: { backgroundColor: palette.emeraldSoft, borderWidth: 1, borderColor: "#2B5B47", borderRadius: 20, padding: 15, gap: 13 },
  reviewBannerIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.emerald, alignItems: "center", justifyContent: "center" },
  imagePreview: { height: 220, borderRadius: 20, overflow: "hidden", backgroundColor: palette.surface, marginTop: 16 },
  imagePreviewImage: { width: "100%", height: "100%", opacity: 0.62 },
  imageOverlay: { ...StyleSheet.absoluteFill, padding: 16, justifyContent: "space-between" },
  imageOverlayText: { color: palette.text, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  ocrBox: { alignSelf: "center", width: "68%", height: 58, borderWidth: 1, borderColor: palette.amber, backgroundColor: "rgba(244,184,96,0.12)", justifyContent: "flex-end", padding: 8 },
  ocrBoxText: { color: palette.amber, fontSize: 10, fontWeight: "800" },
  paperPreview: { marginTop: 16, backgroundColor: palette.paper, borderRadius: 19, padding: 22, gap: 9 },
  paperSmall: { color: palette.ink, fontSize: 16, fontWeight: "900", letterSpacing: 1.2, textAlign: "center" },
  paperTiny: { color: "#776F63", fontSize: 9, fontWeight: "800", textAlign: "center", letterSpacing: 1 },
  paperRule: { height: 1, backgroundColor: "#CFC5B7", marginVertical: 7 },
  paperLine: { color: "#39342E", fontSize: 11, fontFamily: "monospace" },
  paperTotal: { color: palette.ink, fontSize: 15, fontWeight: "900", fontFamily: "monospace" },
  formGap: { height: 12 },
  itemNumber: { width: 32, height: 32, borderRadius: 11, backgroundColor: palette.amberSoft, alignItems: "center", justifyContent: "center" },
  itemNumberText: { color: palette.amber, fontSize: 11, fontWeight: "900" },
  itemTotal: { flex: 1, paddingLeft: 8, justifyContent: "center" },
  itemTotalText: { color: palette.text, fontSize: 13, fontWeight: "800" },
  validationRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.border },
  totalCompare: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 14 },
  rowButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelledText: { color: palette.amber, textAlign: "center", fontSize: 12, marginTop: 18 },
  anomalyShape: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.amberSoft, alignItems: "center", justifyContent: "center" },
  expandedPanel: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: palette.border },
  bodyText: { color: palette.textMuted, fontSize: 13, lineHeight: 20 },
  priceMovement: { fontSize: 15, fontWeight: "900" },
  priceBars: { height: 48, flexDirection: "row", alignItems: "flex-end", gap: 5, marginVertical: 13 },
  priceBar: { flex: 1, borderRadius: 5, backgroundColor: palette.amber },
  preferenceRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: palette.border },
  inventoryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  inventoryValue: { color: palette.text, fontSize: 16, fontWeight: "900", marginLeft: "auto" },
  paperKicker: { color: "#776F63", fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  paperMerchant: { color: palette.ink, fontSize: 20, fontWeight: "900", marginTop: 3 },
  paperDate: { color: "#776F63", fontSize: 11, fontWeight: "700" },
  paperItem: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 5 },
  paperItemDescription: { color: "#39342E", fontSize: 12, flex: 1 },
  paperItemValue: { color: "#39342E", fontSize: 12, fontFamily: "monospace" },
  paperSubtotal: { color: "#776F63", fontSize: 11, fontWeight: "800" },
  paperTotalLabel: { color: palette.ink, fontSize: 11, fontWeight: "900" },
  paperTotalValue: { color: palette.ink, fontSize: 19, fontWeight: "900" },
  auditRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.border },
  auditDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.amber, marginTop: 5 },
  auditDate: { color: palette.textFaint, fontSize: 10, marginTop: 3 },
  brandMarkWrap: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: { width: 30, height: 36, borderRadius: 8, backgroundColor: palette.amber, alignItems: "center", justifyContent: "center" },
  brandMarkLine: { width: 20, height: 3, borderRadius: 2, backgroundColor: palette.ink, transform: [{ rotate: "-9deg" }] },
  brandName: { color: palette.text, fontSize: 13, fontWeight: "900", letterSpacing: 1.5 },
  pill: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", minHeight: 24, borderRadius: 20, paddingHorizontal: 9, gap: 5 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  metricCard: { flex: 1, minHeight: 116, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderTopWidth: 3, borderRadius: 18, padding: 14, gap: 7 },
  metricDetail: { color: palette.textMuted, fontSize: 11, lineHeight: 15 },
  receiptRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: palette.border },
  receiptIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  receiptMerchant: { color: palette.text, fontSize: 14, fontWeight: "800" },
  receiptMeta: { color: palette.textMuted, fontSize: 11 },
  receiptAmount: { color: palette.text, fontSize: 12, fontWeight: "800" },
  confidenceWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  confidenceTrack: { height: 6, flex: 1, backgroundColor: palette.surfaceRaised, borderRadius: 10, overflow: "hidden" },
  confidenceFill: { height: "100%", borderRadius: 10 },
  confidenceValue: { width: 38, textAlign: "right", fontSize: 12, fontWeight: "800" },
  signalField: { height: 150, borderRadius: 20, backgroundColor: "#15191B", borderWidth: 1, borderColor: palette.border, overflow: "hidden", position: "relative" },
  signalLine: { position: "absolute", left: "7%", right: "7%", top: "50%", height: 1, backgroundColor: palette.amber, opacity: 0.38 },
  signalGlow: { position: "absolute", left: "17%", top: "47%", width: 110, height: 10, borderRadius: 20, backgroundColor: palette.amber },
  signalDot: { width: 6, height: 6, borderRadius: 3, position: "absolute" },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: palette.bg },
  emptyState: { minHeight: 240, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl, backgroundColor: palette.surface, borderRadius: 20, borderWidth: 1, borderColor: palette.border },
}));
