import React, { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeDeck } from "./Components/SwipeDeck";
import { fetchMarketsFromApi } from "./Components/data/markets";
import { Market } from "./types";
// Use the centralized live fetch helper which falls back to mocks on error
async function fetchMarketsFromPolymarket(limit = 20, offset = 0) {
  return fetchMarketsFromApi(limit, offset);
}

export default function App() {
  const topInset = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;
  

  const [swiped, setSwiped] = useState<string[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);

  

  // compute tabs (All + unique categories from available markets or mock data)
  const availableCategories = useMemo(() => {
    const source = markets.length > 0 ? markets : [] as Market[];
    const set = new Set<string>();
    for (const m of source) set.add(String(m.category));
    return ["All", ...Array.from(set).sort()];
  }, [markets]);

  type Tab = string;
  const [activeTab, setActiveTab] = useState<Tab>("All");

  useEffect(() => {
    let mounted = true;

    async function load(p: number) {
      setLoadingPage(true);
      try {
        console.log("✅ Starting Polymarket fetch... page", p);
        const { cards, eventsFetched } = await fetchMarketsFromPolymarket(20, p * 20);
        console.log("✅ Polymarket mapped markets count (page):", cards.length);
        console.log("✅ Sample mapped market:", cards[0]);

        if (!mounted) return;

        if (cards.length > 0) {
          setMarkets((prev) => [...prev, ...cards]);
          console.log("🟢 Appended POLYMARKET data page", p);
        } else if (p === 0) {
          console.log("⚠️ Polymarket returned 0 markets on first page; leaving markets empty");
          setMarkets([]);
          setHasMore(false);
        }

        // If the API returned fewer events than the requested limit, assume no more pages
        if (eventsFetched < 20) setHasMore(false);

        setSwiped([]);
        setPage(p);
      } catch (e) {
        console.log("❌ Polymarket fetch failed.", e);
        if (mounted) {
          if (p === 0) {
            console.log("⚠️ Falling back to empty markets list");
            setMarkets([]);
            setHasMore(false);
            setSwiped([]);
          }
        }
      } finally {
        setLoadingPage(false);
      }
    }

    // load first page
    load(0);

    return () => {
      mounted = false;
    };
  }, []);

  // auto-load next page when deck is low and more pages exist
  useEffect(() => {
    const source = markets.length > 0 ? markets : [] as Market[];
    const visible = source.filter((m) => !swiped.includes(m.id));
    // when visible cards are low, fetch next page
    if (visible.length <= 2 && hasMore && !loadingPage) {
      const next = page + 1;
      (async () => {
        setLoadingPage(true);
        try {
          const { cards, eventsFetched } = await fetchMarketsFromPolymarket(20, next * 20);
          if (cards.length > 0) setMarkets((p) => [...p, ...cards]);
          if (eventsFetched < 20) setHasMore(false);
          setPage(next);
          console.log("🟣 Loaded next page", next, "cards:", cards.length);
        } catch (e) {
          console.log("❌ Failed loading next page", e);
          setHasMore(false);
        } finally {
          setLoadingPage(false);
        }
      })();
    }
  }, [markets, swiped, hasMore, loadingPage, page]);

  const deck = useMemo(() => {
    const source = markets.length > 0 ? markets : [] as Market[];
    const filtered = source.filter((m) => !swiped.includes(m.id));
    if (activeTab === "All") return filtered;

    // best-effort category mapping from the web data
    const key = activeTab.toLowerCase();
    return filtered.filter((m) => String(m.category).toLowerCase().includes(key));
  }, [activeTab, swiped, markets]);

  const onSwipe = (direction: "left" | "right" | "down", market: Market) => {
    // debug: log swipe event and current swiped count
    try {
      // eslint-disable-next-line no-console
      console.log("[App] onSwipe", { direction, id: market.id, swipedBefore: swiped.length });
    } catch {}

    setSwiped((p) => {
      const next = [...p, market.id];
      try {
        // eslint-disable-next-line no-console
        console.log("[App] swiped after set ->", next.length, next.slice(-5));
      } catch {}
      return next;
    });
  };

  const reset = () => setSwiped([]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, { paddingTop: topInset }]}> 
        <Header />
        <Tabs active={activeTab} setActive={setActiveTab} available={availableCategories} />

        <View style={styles.stage}>
          {deck.length > 0 ? (
            <SwipeDeck markets={deck} onSwipe={onSwipe} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No more cards</Text>
              <TouchableOpacity onPress={reset} style={styles.resetBtn} activeOpacity={0.85}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}


function Header() {
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


function Tabs({ active, setActive, available }: { active: string; setActive: (t: string) => void; available: string[] }) {
  return (
    <View style={styles.tabsWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsRow}
      >
        {available.map((t) => {
          const isActive = t === active;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setActive(t)}
              activeOpacity={0.85}
              style={[styles.tab, isActive ? styles.tabActive : styles.tabInactive]}
            >
              <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}





const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F3FB" },
  container: { flex: 1, backgroundColor: "#F4F3FB" },

  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 26, fontWeight: "900", color: "#6F5BFF", letterSpacing: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B0F17",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  pillSep: { color: "rgba(255,255,255,0.4)", marginHorizontal: 8, fontWeight: "800" },

  // compact tabs to match design (30-40px height)
  tabsWrap: {
  height: 56,              // ✅ adjust 52–60 as you like
  justifyContent: "center",
},
tabsScroll: {
  flexGrow: 0,             // ✅ stops it from expanding
  flexShrink: 0,
},
tabsRow: {
  flexDirection: "row",
  gap: 10,
  paddingHorizontal: 18,
  alignItems: "center",
  // ✅ avoid big vertical padding here since wrap already centers it
  paddingVertical: 0,
},
tab: { height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  tabActive: { backgroundColor: "#0B0F17" },
  tabInactive: { backgroundColor: "#FFFFFF" },
  tabText: { fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: "#FFFFFF" },
  tabTextInactive: { color: "rgba(11,15,23,0.55)" },

  // place deck below header/tabs; use flex-start so the card sits under the header
 stage: {
  flex: 1,
  width: "100%",
  alignItems: "center",
  justifyContent: "flex-start",
  paddingTop: 12,
  paddingBottom: 0,
},

  empty: { alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: "#0B0F17", marginBottom: 12 },
  resetBtn: { backgroundColor: "#6F5BFF", paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14 },
  resetText: { color: "#fff", fontWeight: "900" },

  // navWrap: { paddingHorizontal: 18, paddingBottom: 14, paddingTop: 16 },
  nav: {
    height: 72,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
 // navItem: { width: 56, alignItems: "center", justifyContent: "center" },
  navIcon: { width: 24, height: 24, resizeMode: "contain" },
  //liveUnderline: { width: 28, height: 3, borderRadius: 999, backgroundColor: "#0B0F17", marginTop: 6 },

  navCenterOuter: { width: 76, alignItems: "center", justifyContent: "center" },
  navCenter: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#6F5BFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6F5BFF",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  //centerIcon: { width: 26, height: 26, resizeMode: "contain", tintColor: "#fff" },
    navWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: "center",
    zIndex: 50,
  },

  // white pill container like SS
  navPill: {
    width: "92%",
    maxWidth: 440,
    height: 76,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.96)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  navItem: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },

  navIconInactive: {
    width: 26,
    height: 26,
    resizeMode: "contain",
    opacity: 0.55,
  },

  navIconActive: {
    width: 26,
    height: 26,
    resizeMode: "contain",
    opacity: 1,
  },

  liveUnderline: {
    marginTop: 6,
    width: 28,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#0B0F17",
  },

  // reserves a middle gap so spacing matches
  centerSlot: {
    width: 92,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
  },

  // raised purple circle overlapping the pill (like SS)
  centerBtn: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: "#6F5BFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -(74 * 0.50), // raise it upward (overlap)

    shadowColor: "#6F5BFF",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },

  centerIcon: {
    width: 74,
    height: 74,
    resizeMode: "contain",
   // tintColor: "#fff",
  },
});
