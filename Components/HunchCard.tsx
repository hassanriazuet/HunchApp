import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Market } from "../types";

function splitHighlight(question: string) {
  // Highlight a 4-digit year or $xxxK style token, similar to screenshot.
  const year = question.match(/(\b\d{4}\b)/);
  if (year?.index !== undefined) {
    const i = year.index;
    const token = year[0];
    return { pre: question.slice(0, i), mid: token, post: question.slice(i + token.length) };
  }
  const money = question.match(/(\$\d+(?:\.\d+)?K?\??)/i);
  if (money?.index !== undefined) {
    const i = money.index;
    const token = money[0];
    return { pre: question.slice(0, i), mid: token, post: question.slice(i + token.length) };
  }
  return { pre: question, mid: "", post: "" };
}

export function HunchCard({ market }: { market: Market }) {
  const yesPct = Math.max(1, Math.min(99, market.yesPercent));
  const noPct = 100 - yesPct;

  // Use market-provided payouts if present (video), else synthesize.
  const base = 150;
  const swing = Math.round((noPct - 50) * 2);
  const noPayout = (market as any).noPayout ?? Math.max(105, base - swing);
  const yesPayout = (market as any).yesPayout ?? Math.max(105, base + swing);

  const q = splitHighlight(market.question);

  // Live countdown state
  const [countdown, setCountdown] = useState<string>(market.closingIn ?? "TBD");

  const closingIso = (market as any).closingAt ?? null;

  const compute = () => {
    if (!closingIso) return "TBD";
    const end = new Date(closingIso);
    const now = new Date();
    let delta = Math.floor((end.getTime() - now.getTime()) / 1000);
    if (delta <= 0) return "Closed";
    const days = Math.floor(delta / (24 * 3600));
    delta -= days * 24 * 3600;
    const hours = Math.floor(delta / 3600);
    delta -= hours * 3600;
    const minutes = Math.floor(delta / 60);
    const seconds = delta - minutes * 60;
    const parts: string[] = [];
    if (days) parts.push(`${days}days`);
    if (hours) parts.push(`${hours}hr`);
    if (minutes) parts.push(`${minutes}min`);
    if (seconds) parts.push(`${seconds}sec`);
    return parts.join(" ") || "0sec";
  };

  useEffect(() => {
    // initialize
    setCountdown(compute());
    if (!closingIso) return;
    const id = setInterval(() => setCountdown(compute()), 1000);
    return () => clearInterval(id);
  }, [closingIso]);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.catChip}>
          <Text style={styles.catText}>{String(market.category).toUpperCase()}</Text>
        </View>

        <View style={styles.pricePill}>
          <Text style={styles.priceText}>Price: ${market.price}</Text>
        </View>
      </View>

      <View style={styles.center}>
        <Text style={styles.question} numberOfLines={4} adjustsFontSizeToFit>
          {q.pre}
          {q.mid ? <Text style={styles.questionHighlight}>{q.mid}</Text> : null}
          {q.post}
        </Text>

        <View style={styles.timerPill}>
          <Text style={styles.timerText}>{countdown}</Text>
        </View>
      </View>

      <View style={styles.votesRow}>
        <Text style={styles.noPct}>NO {noPct}%</Text>
        <Text style={styles.yesPct}>YES {yesPct}%</Text>
      </View>

      <View style={styles.barWrap}>
        <View style={[styles.barNo, { width: `${noPct}%` }]} />
        <View style={[styles.barYes, { width: `${yesPct}%` }]} />
      </View>

      <View style={styles.payoutRow}>
        <View style={styles.payoutCol}>
          <Text style={styles.payoutLabel}>If NO wins</Text>
          <View style={styles.payoutPillNo}>
            <Text style={styles.payoutValueNo}>${Number(noPayout).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.payoutColRight}>
          <Text style={styles.payoutLabel}>If YES wins</Text>
          <View style={styles.payoutPillYes}>
            <Text style={styles.payoutValueYes}>${Number(yesPayout).toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: 22 },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  catChip: { backgroundColor: "#0B0F17", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  catText: { color: "#fff", fontSize: 14, fontWeight: "900" },

  pricePill: { backgroundColor: "#EFEAFF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  priceText: { color: "#0B0F17", fontWeight: "900", fontSize: 14 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  question: { fontSize: 40, fontWeight: "900", color: "#0B0F17", textAlign: "center", lineHeight: 44 },
  questionHighlight: { color: "#6F5BFF" },

  timerPill: { marginTop: 18, backgroundColor: "#EFEFEF", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  timerText: { color: "#0B0F17", fontWeight: "900", fontSize: 13 },

  votesRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  noPct: { fontWeight: "900", fontSize: 20, color: "#0B0F17" },
  yesPct: { fontWeight: "900", fontSize: 20, color: "#6F5BFF" },

  barWrap: { height: 6, backgroundColor: "rgba(11,15,23,0.10)", borderRadius: 999, overflow: "hidden", flexDirection: "row", marginTop: 12 },
  barNo: { height: "100%", backgroundColor: "#0B0F17" },
  barYes: { height: "100%", backgroundColor: "#6F5BFF" },

  payoutRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, alignItems: "flex-end" },
  payoutCol: { width: "48%" },
  payoutColRight: { width: "48%", alignItems: "flex-end" },
  payoutLabel: { color: "#0B0F17", fontWeight: "900", fontSize: 12, marginBottom: 8, opacity: 0.9 },

  payoutPillNo: { backgroundColor: "#EFEAFF", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  payoutValueNo: { color: "#0B0F17", fontWeight: "900", fontSize: 16 },

  payoutPillYes: { backgroundColor: "#5524D7", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  payoutValueYes: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
