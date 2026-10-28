import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { useSmartReceipt } from "@/lib/smartreceipt/context";
import { palette } from "@/lib/smartreceipt/theme";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { state } = useSmartReceipt();
  const openAnomalies = state.anomalies.filter((anomaly) => anomaly.status === "open").length;
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: palette.amber, tabBarInactiveTintColor: palette.textMuted, tabBarButton: HapticTab, tabBarStyle: { height: 58 + bottomPadding, paddingTop: 8, paddingBottom: bottomPadding, backgroundColor: palette.bgSoft, borderTopColor: palette.border, borderTopWidth: 1 }, tabBarLabelStyle: { fontSize: 10, fontWeight: "700" } }}>
      <Tabs.Screen name="index" options={{ title: "Overview", tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="receipts" options={{ title: "Receipts", tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="insights" options={{ title: "Insights", tabBarBadge: openAnomalies || undefined, tabBarBadgeStyle: { backgroundColor: palette.amber, color: palette.ink, fontSize: 10 }, tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
