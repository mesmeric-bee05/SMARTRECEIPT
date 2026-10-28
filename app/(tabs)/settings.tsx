import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Platform, Switch, Text, View } from "react-native";

import { AppHeader, BrandMark, Field, OfflinePill, PrimaryButton, Screen, SectionHeader, styles } from "@/components/smartreceipt-ui";
import { useSmartReceipt } from "@/lib/smartreceipt/context";
import { palette } from "@/lib/smartreceipt/theme";

const confirmReset = (onConfirm: () => void) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (window.confirm("Reset the local demo ledger? This removes locally stored receipts.")) onConfirm();
    return;
  }
  Alert.alert("Reset local ledger", "This removes locally stored receipts and restores the demo ledger.", [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: onConfirm }]);
};

export default function SettingsScreen() {
  const { state, setSettings, resetLocalData } = useSmartReceipt();
  const [businessName, setBusinessName] = useState(state.settings.businessName);
  const [displayName, setDisplayName] = useState(state.settings.displayName);
  const saveProfile = () => void setSettings({ businessName: businessName.trim() || "My retail business", displayName: displayName.trim() || "Operator" });
  return <Screen>
    <View style={styles.spread}><BrandMark compact /><OfflinePill /></View>
    <AppHeader title="Settings" subtitle="Keep the ledger local, legible, and in your control." />
    <View style={styles.section}><SectionHeader title="Business profile" hint="Used for receipt context and reports" /><View style={styles.card}><Field label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" /><View style={{ height: 12 }} /><Field label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="Your business" /><PrimaryButton icon="checkmark" onPress={saveProfile} style={{ marginTop: 14 }}>Save profile</PrimaryButton></View></View>
    <View style={styles.section}><SectionHeader title="Preferences" hint="These settings apply locally" /><View style={styles.card}>{[
      { label: "Reduced motion", detail: "Disable non-essential movement", value: state.settings.motionReduced, onChange: (value: boolean) => void setSettings({ motionReduced: value }) },
      { label: "Privacy mode", detail: "Hide totals and merchant names in summaries", value: state.settings.privacyMode, onChange: (value: boolean) => void setSettings({ privacyMode: value }) },
      { label: "Diagnostics", detail: "Keep redacted local health counters", value: state.settings.diagnosticsEnabled, onChange: (value: boolean) => void setSettings({ diagnosticsEnabled: value }) },
    ].map((item) => <View key={item.label} style={styles.preferenceRow}><View style={{ flex: 1, gap: 4 }}><Text style={styles.receiptMerchant}>{item.label}</Text><Text style={styles.receiptMeta}>{item.detail}</Text></View><Switch accessibilityLabel={item.label} value={item.value} onValueChange={item.onChange} trackColor={{ false: palette.surfaceRaised, true: palette.amberSoft }} thumbColor={item.value ? palette.amber : palette.textMuted} /></View>)}</View></View>
    <View style={styles.section}><SectionHeader title="Local data inventory" hint="No cloud account required" /><View style={styles.card}>{[{ icon: "receipt-outline", label: "Receipts", value: state.receipts.length }, { icon: "pulse-outline", label: "Price observations", value: state.priceObservations.length }, { icon: "alert-circle-outline", label: "Open warnings", value: state.anomalies.filter((item) => item.status === "open").length }].map((row) => <View key={row.label} style={styles.inventoryRow}><Ionicons name={row.icon as any} size={18} color={palette.amber} /><Text style={styles.receiptMerchant}>{row.label}</Text><Text style={styles.inventoryValue}>{row.value}</Text></View>)}</View></View>
    <View style={styles.section}><SectionHeader title="Recovery & export" hint="Safe mobile fallbacks" /><View style={styles.card}><Text style={styles.bodyText}>The mobile prototype keeps the receipt ledger on this device. Native encrypted backup, OS keychain storage, and camera OCR require a native build module; these controls are intentionally not faked in Expo Preview.</Text><View style={styles.rowButtons}><PrimaryButton variant="secondary" icon="download-outline" onPress={() => Alert.alert("Export", "A structured export flow is ready for the native handoff.")}>Export data</PrimaryButton><PrimaryButton variant="secondary" icon="information-circle-outline" onPress={() => Alert.alert("Diagnostics", `${state.receipts.length} receipts · ${state.priceObservations.length} observations · schema v${state.schemaVersion}`)}>Health check</PrimaryButton></View></View></View>
    <View style={styles.section}><SectionHeader title="Danger zone" hint="This action is reversible only through a fresh demo seed" /><PrimaryButton variant="danger" icon="refresh-outline" onPress={() => confirmReset(() => void resetLocalData())}>Reset local demo ledger</PrimaryButton></View>
  </Screen>;
}
