import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Market, UserState } from "../../types";
import { SwipeDeck } from "../SwipeDeck";
import { fetchMarketsFromApi } from "../data/markets";


export function ExploreScreen() {
  const [userState, setUserState] = useState<UserState>({
    balance: 1000,
    xp: 0,
    streak: 1,
    positions: [],
    isDemoMode: true,
  });

  const [swiped, setSwiped] = useState<string[]>([]);

  // ✅ NEW: markets state (starts with mock so UI works instantly)
  const [markets, setMarkets] = useState<Market[]>([]);
  const [source, setSource] = useState<'POLY' | 'MOCK' | 'UNKNOWN'>('UNKNOWN');

  // ✅ NEW: fetch Polymarket YES/NO markets on screen mount

  useEffect(() => {
  let mounted = true;

  (async () => {
    try {
      console.log("✅ Starting Polymarket fetch...");
  const { cards, eventsFetched } = await fetchMarketsFromApi();

      console.log("✅ Polymarket mapped markets count:", cards.length);
      console.log("✅ Sample mapped market:", cards[0]);

      if (!mounted) return;

      // ✅ If Polymarket returned valid markets, use them
      if (cards.length > 0) {
        setMarkets(cards);
        setSource('POLY');
        console.log("🟢 Using POLYMARKET data");
      } else {
        // ✅ Fallback if mapping returned nothing
        console.log("⚠️ Polymarket returned 0 markets, leaving empty list");
        setMarkets([]);
        setSource('MOCK');
      }

      setSwiped([]);

    } catch (e) {
  console.log("❌ Polymarket fetch failed.", e);

  if (mounted) {
    console.log("⚠️ Falling back to empty markets list");
    setMarkets([]);
    setSource('MOCK');
    setSwiped([]);
  }
}



      })();

      return () => {
        mounted = false;
      };
    }, []);



  // ✅ CHANGED: deck is built from "markets" instead of MOCK_MARKETS
  const deck = useMemo(
    () => markets.filter((m) => !swiped.includes(m.id)),
    [markets, swiped]
  );

  const onSwipe = (direction: "left" | "right" | "down", market: Market) => {
    // Down = pass
    // debug log
    try {
      // eslint-disable-next-line no-console
      console.log("[Explore] onSwipe", { direction, id: market.id, swipedBefore: swiped.length });
    } catch {}

    if (direction === "down") {
      setSwiped((p) => [...p, market.id]);
      try {
        // eslint-disable-next-line no-console
        console.log("[Explore] swiped after set (down)");
      } catch {}
      return;
    }

    const side = direction === "right" ? "YES" : "NO";
    const stake = market.price || 10;

    if (userState.balance < stake) {
      // insufficient funds -> treat as pass
      setSwiped((p) => [...p, market.id]);
      return;
    }

  setUserState((prev: UserState) => ({
      ...prev,
      balance: prev.balance - stake,
      xp: prev.xp + 5,
      positions: [
        ...prev.positions,
        {
          marketId: market.id,
          question: market.question,
          side,
          stake,
          entryYesPercent: market.yesPercent,
          createdAt: Date.now(),
        },
      ],
    }));

    setSwiped((p) => {
      const next = [...p, market.id];
      try {
        // eslint-disable-next-line no-console
        console.log("[Explore] swiped after set ->", next.length, next.slice(-5));
      } catch {}
      return next;
    });
  };

  // Optional: reset swipes only (keeps same fetched list)
  const reset = () => setSwiped([]);

  return (
    <View style={styles.stage}>
  {markets.length === 0 ? (
    <Text>Loading markets...</Text>
  ) : deck.length > 0 ? (
  <View style={{ width: "100%", alignItems: "center", justifyContent: "center" }}>
    <View style={{ position: "absolute", top: 50, zIndex: 999, alignItems: 'center' }}>
      <Text style={{ fontWeight: "900", marginBottom: 6 }}>SOURCE: {source}</Text>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity
          onPress={() => {
            // force live fetch
            setSource('UNKNOWN');
            (async () => {
              try {
                const { cards } = await fetchMarketsFromApi();
                if (cards.length > 0) {
                  setMarkets(cards);
                  setSource('POLY');
                  setSwiped([]);
                } else {
                  setMarkets([]);
                  setSource('MOCK');
                  setSwiped([]);
                }
              } catch (e) {
                setMarkets([]);
                setSource('MOCK');
                setSwiped([]);
              }
            })();
          }}
          style={{ backgroundColor: '#6f5bff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>Force LIVE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setMarkets([]);
            setSource('MOCK');
            setSwiped([]);
          }}
          style={{ backgroundColor: '#ddd', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
        >
          <Text style={{ fontWeight: '800' }}>Force EMPTY</Text>
        </TouchableOpacity>
      </View>
    </View>

    <SwipeDeck markets={deck} onSwipe={onSwipe} />
  </View>
) : (

    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No more markets</Text>
      <TouchableOpacity onPress={reset} style={styles.resetBtn}>
        <Text style={styles.resetText}>Reset</Text>
      </TouchableOpacity>
    </View>
  )}
</View>

  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#f4f3fb" },
  balanceRow: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: { color: "rgba(11,15,23,0.55)", fontWeight: "800" },
  balanceValue: { color: "#0b0f17", fontWeight: "900", fontSize: 16 },

  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center" },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0b0f17",
    marginBottom: 12,
  },
  resetBtn: {
    backgroundColor: "#6f5bff",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  resetText: { color: "#fff", fontWeight: "900" },
});
