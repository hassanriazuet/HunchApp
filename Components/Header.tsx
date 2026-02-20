import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>HUNCH</Text>
      <View style={styles.pill}>
        <Text style={styles.pillText}>H 235</Text>
        <Text style={styles.pillSep}>|</Text>
        <Text style={styles.pillText}>$ 1000</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 26, fontWeight: "900", color: "#6f5bff", letterSpacing: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b0f17",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillText: { color: "#ffffff", fontWeight: "800", fontSize: 12 },
  pillSep: { color: "rgba(255,255,255,0.4)", marginHorizontal: 8, fontWeight: "800" },
});
