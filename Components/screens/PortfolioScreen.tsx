import React, { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { UserState } from "../../types";
import { Header } from "../Header";

// Minimal portfolio mirroring web logic: positions + balance (demo)
export function PortfolioScreen() {
  const [userState] = useState<UserState>({
    balance: 1000,
    xp: 0,
    streak: 1,
    positions: [],
    isDemoMode: true,
  });

  return (
    <View style={styles.wrap}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.h1}>Portfolio</Text>
        <Text style={styles.sub}>Positions will appear here after you swipe-trade on Explore.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Total Balance</Text>
          <Text style={styles.value}>${userState.balance.toLocaleString()}</Text>
        </View>

        <FlatList
          data={userState.positions}
          keyExtractor={(p) => p.marketId + p.createdAt}
          ListEmptyComponent={<Text style={styles.empty}>No positions yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.pos}>
              <Text style={styles.posQ} numberOfLines={2}>{item.question}</Text>
              <Text style={styles.posMeta}>{item.side} • Stake ${item.stake} • Entry {item.entryYesPercent}%</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#f4f3fb" },
  content: { flex: 1, paddingHorizontal: 18 },
  h1: { fontSize: 22, fontWeight: "900", color: "#0b0f17", marginTop: 10 },
  sub: { marginTop: 8, color: "rgba(11,15,23,0.6)", fontWeight: "700" },
  card: { marginTop: 14, backgroundColor: "#fff", borderRadius: 18, padding: 14 },
  label: { color: "rgba(11,15,23,0.55)", fontWeight: "900", textTransform: "uppercase", fontSize: 12 },
  value: { marginTop: 6, fontSize: 28, fontWeight: "900", color: "#0b0f17" },
  empty: { marginTop: 18, color: "rgba(11,15,23,0.55)", fontWeight: "800" },
  pos: { marginTop: 10, backgroundColor: "#fff", borderRadius: 18, padding: 14 },
  posQ: { fontWeight: "900", color: "#0b0f17" },
  posMeta: { marginTop: 6, color: "rgba(11,15,23,0.6)", fontWeight: "700" },
});
