import BottomNav from "@/Components/BottomNav";
import { usePrivy } from "@privy-io/expo";
import { Slot, usePathname, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const { user } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();
  React.useEffect(() => {
    try {
      console.log("[TabsLayout] user:", user);
      console.log("[TabsLayout] pathname:", pathname);
      console.log("[TabsLayout] children present:", !!children);
    } catch (e) {
      // ignore
    }
  }, [user, pathname, children]);

  const isWallet = pathname?.endsWith("/wallet");
  const isProfile = pathname?.endsWith("/profile");
  const isStats = pathname?.endsWith("/stats");
  const isPodcast = pathname?.endsWith("/podcast");
  const isExplore = pathname === "" || pathname === "/" || pathname?.endsWith("/index");
  const SHOW_DEBUG = false; // set to true to view debug banner

  return (
    <View style={styles.container}>
      {/* debug banner to help surface auth/navigation state in-app (disabled by default) */}
      {SHOW_DEBUG ? (
        <View style={styles.debugBanner} pointerEvents="none">
          <Text style={styles.debugText}>{user ? `user: ${ (user as any)?.email ?? (user as any)?.id ?? 'signed'}` : 'user: not signed'}</Text>
          <Text style={styles.debugText}>path: {String(pathname)}</Text>
        </View>
      ) : null}

      <View style={styles.content}>
        <Slot />
      </View>

      {/* persistent bottom nav */}
      <BottomNav />

      {/* Removed auth overlay so tab children always render. If you want a login modal,
          we can add a smaller non-blocking overlay or a modal route instead. */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  navWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: "center",
    zIndex: 50,
  },
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
  navItem: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  navIconInactive: { width: 26, height: 26, resizeMode: "contain", opacity: 0.55 },
  navIconActive: { width: 26, height: 26, resizeMode: "contain", opacity: 1 },
  centerSlot: { width: 92, height: 76, alignItems: 'center', justifyContent: 'center' },
  centerBtn: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: '#6F5BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -(74 * 0.50),
    shadowColor: '#6F5BFF',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  centerIcon: { width: 44, height: 44, resizeMode: 'contain' },
  debugBanner: { position: 'absolute', top: 8, left: 12, right: 12, zIndex: 1000, flexDirection: 'row', justifyContent: 'space-between' },
  debugText: { fontSize: 12, color: '#222', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  authOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "center", alignItems: "center" },
});
