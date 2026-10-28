import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Platform, Share, Switch, Text, View } from "react-native";

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
  const { state, storageIssue, setSettings, resetLocalData, restoreReceipt } = useSmartReceipt();
  const [businessName, setBusinessName] = useState(state.settings.businessName);
  const [displayName, setDisplayName] = useState(state.settings.displayName);
  const [defaultCurrency, setDefaultCurrency] = useState(state.settings.defaultCurrency);
  const archived = state.receipts.filter((receipt) => receipt.status === "archived");
  const active = state.receipts.filter((receipt) => receipt.status !== "archived");
  const saveProfile = () => void setSettings({ businessName: businessName.trim() || "My retail business", displayName: displayName.trim() || "Operator", defaultCurrency: defaultCurrency.trim().toUpperCase() || "KES" });
  const exportData = async () => {
    const payload = JSON.stringify({ app: "SmartReceipt", exportedAt: new Date().toISOString(), ...state, schemaVersion: state.schemaVersion }, null, 2);
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `smartreceipt-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }
    await Share.share({ title: "SmartReceipt export", message: payload });
  };
  const showDiagnostics = () => Alert.alert("Local diagnostics", [`Active receipts: ${active.length}`, `Archived receipts: ${archived.length}`, `Price observations: ${state.priceObservations.length}`, `Open anomalies: ${state.anomalies.filter((item) => ["open", "unresolved"].includes(item.status)).length}`, `Schema: v${state.schemaVersion}`, `Last opened: ${state.lastOpenedAt}`, storageIssue ? `Storage warning: ${storageIssue}` : "Storage: healthy"].join("\n"));
  return <Screen>
    <View style={styles.spread}><BrandMark compact /><OfflinePill /></View>
    <AppHeader title="Settings" subtitle="Keep the ledger local, legible, and in your control." />
    {storageIssue ? <View style={[styles.card, { borderColor: palette.amber }]}><Text style={styles.bodyText}>{storageIssue}</Text></View> : null}
    <View style={styles.section}><SectionHeader title="Business profile" hint="Used for receipt context and reports" /><View style={styles.card}><Field label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" /><View style={{ height: 12 }} /><Field label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="Your business" /><View style={{ height: 12 }} /><Field label="Default currency" value={defaultCurrency} onChangeText={(value) => setDefaultCurrency(value.toUpperCase())} placeholder="KES" autoCapitalize="characters" /><PrimaryButton icon="checkmark" onPress={saveProfile} style={{ marginTop: 14 }}>Save profile</PrimaryButton></View></View>
    <View style={styles.section}><SectionHeader title="Preferences" hint="These settings apply locally" /><View style={styles.card}>{[
      { label: "Reduced motion", detail: "Disable non-essential movement", value: state.settings.motionReduced, onChange: (value: boolean) => void setSettings({ motionReduced: value }) },
      { label: "Privacy mode", detail: "Hide totals and merchant names in summaries", value: state.settings.privacyMode, onChange: (value: boolean) => void setSettings({ privacyMode: value }) },
      { label: "Diagnostics", detail: "Keep redacted local health counters", value: state.settings.diagnosticsEnabled, onChange: (value: boolean) => void setSettings({ diagnosticsEnabled: value }) },
    ].map((item) => <View key={item.label} style={styles.preferenceRow}><View style={{ flex: 1, gap: 4 }}><Text style={styles.receiptMerchant}>{item.label}</Text><Text style={styles.receiptMeta}>{item.detail}</Text></View><Switch accessibilityLabel={item.label} value={item.value} onValueChange={item.onChange} trackColor={{ false: palette.surfaceRaised, true: palette.amberSoft }} thumbColor={item.value ? palette.amber : palette.textMuted} /></View>)}</View></View>
    <View style={styles.section}><SectionHeader title="Local data inventory" hint="No cloud account required" /><View style={styles.card}>{[{ icon: "receipt-outline", label: "Active receipts", value: active.length }, { icon: "archive-outline", label: "Archived receipts", value: archived.length }, { icon: "pulse-outline", label: "Price observations", value: state.priceObservations.length }, { icon: "alert-circle-outline", label: "Open warnings", value: state.anomalies.filter((item) => ["open", "unresolved"].includes(item.status)).length }].map((row) => <View key={row.label} style={styles.inventoryRow}><Ionicons name={row.icon as any} size={18} color={palette.amber} /><Text style={styles.receiptMerchant}>{row.label}</Text><Text style={styles.inventoryValue}>{row.value}</Text></View>)}</View></View>
    {archived.length ? <View style={styles.section}><SectionHeader title="Archived receipts" hint="Records remain restorable on this device" /><View style={{ gap: 10 }}>{archived.map((receipt) => <View key={receipt.id} style={styles.card}><View style={styles.spread}><View style={{ flex: 1 }}><Text style={styles.receiptMerchant}>{state.settings.privacyMode ? "••••••" : receipt.merchant}</Text><Text style={styles.receiptMeta}>{receipt.transactionDate} · archived</Text></View><PrimaryButton variant="secondary" onPress={() => void restoreReceipt(receipt.id)}>Restore</PrimaryButton></View></View>)}</View></View> : null}
    <View style={styles.section}><SectionHeader title="Recovery & export" hint="Exports are user-initiated and unencrypted" /><View style={styles.card}><Text style={styles.bodyText}>The JSON export includes the local ledger and may contain sensitive receipt data. Store it securely; it is not an encrypted backup.</Text><View style={styles.rowButtons}><PrimaryButton variant="secondary" icon="download-outline" onPress={() => void exportData()}>Export JSON</PrimaryButton><PrimaryButton variant="secondary" icon="information-circle-outline" onPress={showDiagnostics}>Health check</PrimaryButton></View></View></View>
    <View style={styles.section}><SectionHeader title="Danger zone" hint="This action replaces the local ledger with the demo seed" /><PrimaryButton variant="danger" icon="refresh-outline" onPress={() => confirmReset(() => void resetLocalData())}>Reset local demo ledger</PrimaryButton></View>
  </Screen>;
}
