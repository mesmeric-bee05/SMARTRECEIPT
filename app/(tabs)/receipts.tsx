import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { AppHeader, IconButton, OfflinePill, PrimaryButton, ReceiptRow, Screen, SectionHeader, EmptyState, styles } from "@/components/smartreceipt-ui";
import { useSmartReceipt } from "@/lib/smartreceipt/context";
import { palette } from "@/lib/smartreceipt/theme";

type Filter = "all" | "verified" | "review" | "flagged";

export default function ReceiptsScreen() {
  const router = useRouter();
  const { state } = useSmartReceipt();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const receipts = useMemo(() => state.receipts.filter((receipt) => {
    const matchesSearch = `${receipt.merchant} ${receipt.transactionDate} ${receipt.currency}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || receipt.status === filter;
    return matchesSearch && matchesFilter;
  }), [state.receipts, search, filter]);
  const filters: { key: Filter; label: string }[] = [{ key: "all", label: "All" }, { key: "verified", label: "Verified" }, { key: "review", label: "Review" }, { key: "flagged", label: "Flagged" }];
  return <Screen>
    <View style={styles.spread}><OfflinePill /><IconButton icon="add" label="Import receipt" onPress={() => router.push("/import")} /></View>
    <AppHeader title="Receipts" subtitle="Search the local paper trail in seconds." />
    <View style={styles.searchBox}><Ionicons name="search-outline" size={19} color={palette.textMuted} /><TextInput accessibilityLabel="Search receipts" value={search} onChangeText={setSearch} placeholder="Merchant, date, currency" placeholderTextColor={palette.textFaint} style={styles.searchInput} /></View>
    <View style={styles.filterRail}>{filters.map((item) => <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: filter === item.key }} onPress={() => setFilter(item.key)} style={[styles.filterChip, filter === item.key && styles.filterChipActive]}><Text style={[styles.filterChipText, filter === item.key && styles.filterChipTextActive]}>{item.label}</Text></Pressable>)}</View>
    <View style={styles.section}><SectionHeader title={`${receipts.length} records`} hint="Stored on this device" />{receipts.length ? <View style={styles.card}>{receipts.map((receipt) => <ReceiptRow key={receipt.id} receipt={receipt} onPress={() => router.push({ pathname: "/receipt/[id]", params: { id: receipt.id } })} />)}</View> : <EmptyState icon="search-outline" title="No matching receipts" body="Try a different merchant, date, or status filter." action={<PrimaryButton variant="secondary" onPress={() => { setSearch(""); setFilter("all"); }}>Clear filters</PrimaryButton>} />}</View>
  </Screen>;
}
