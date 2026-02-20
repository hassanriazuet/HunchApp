import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEmbeddedEthereumWallet, usePrivy } from "@privy-io/expo";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { clearStoredSessionKey, getStoredSessionKey, setStoredSessionKey } from "../services/sessionKeyStorage";
import {
  createAndApproveSessionKeyAccount,
  createKernelClientFromSerializedSessionKey,
  createKernelClientWithEmbeddedWallet,
} from "../services/zerodevClient";

/**
 * Ensures the Privy embedded EIP-1193 provider is connected to Base Sepolia.
 * Base Sepolia:
 *  - chainId (dec): 84532
 *  - chainId (hex): 0x14a34
 */
async function ensureBaseSepolia(provider: any) {
  const BASE_SEPOLIA_HEX = "0x14a34";

  const currentChainId = (await provider.request({ method: "eth_chainId" })) as string;
  console.log("Current chain:", currentChainId);

  if (currentChainId?.toLowerCase() === BASE_SEPOLIA_HEX) {
    console.log("Already on Base Sepolia");
    return;
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_SEPOLIA_HEX }],
    });
    console.log("Switched to Base Sepolia");
  } catch (err: any) {
    const code = err?.code;
    console.log("Switch error:", err);

    // 4902 = chain not added
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BASE_SEPOLIA_HEX,
            chainName: "Base Sepolia",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://sepolia.base.org"],
            blockExplorerUrls: ["https://sepolia.basescan.org"],
          },
        ],
      });

      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA_HEX }],
      });

      console.log("Added + switched to Base Sepolia");
      return;
    }

    throw err;
  }
}

function chainName(chainIdHex: string | null) {
  if (!chainIdHex) return "Unknown";
  switch (chainIdHex.toLowerCase()) {
    case "0x1":
      return "Ethereum Mainnet";
    case "0x14a34":
      return "Base Sepolia";
    case "0x2105":
      return "Base";
    case "0xaa36a7":
      return "Sepolia";
    default:
      return `Unknown (${chainIdHex})`;
  }
}

// Format hex balance (wei) -> ETH string (no ethers dependency)
function weiHexToEthString(hexWei: string): string {
  try {
    const wei = BigInt(hexWei);
    const base = 10n ** 18n;
    const whole = wei / base;
    const frac = wei % base;

    // show up to 6 decimals (trim trailing zeros)
    const fracStr = frac.toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "");
    return fracStr.length ? `${whole.toString()}.${fracStr}` : whole.toString();
  } catch {
    return "0";
  }
}

export default function HomeScreen() {
  const { user, logout } = usePrivy();
  const { create, wallets } = useEmbeddedEthereumWallet();

  const embeddedWallet = useMemo(() => wallets?.[0] ?? null, [wallets]);

  const [creating, setCreating] = useState(false);
  const [balanceEth, setBalanceEth] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);

  const [kernelAddress, setKernelAddress] = useState<string | null>(null);
  const [kernelChainId, setKernelChainId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Session key UX state
  const [hasStoredSession, setHasStoredSession] = useState<boolean | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rawSession, setRawSession] = useState<string | null>(null);
  const [showSessionJson, setShowSessionJson] = useState(false);

  const email = (user as any)?.email;

  // 1) Ensure an embedded wallet exists (create after login)
  useEffect(() => {
    let cancelled = false;

    async function ensureWallet() {
      if (!user) return;
      if (embeddedWallet) return;

      try {
        setError(null);
        setCreating(true);
        await create();
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to create embedded wallet");
      } finally {
        if (!cancelled) setCreating(false);
      }
    }

    ensureWallet();
    return () => {
      cancelled = true;
    };
  }, [user, embeddedWallet, create]);

  // 2) Load session key presence once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getStoredSessionKey();
        if (!cancelled) {
          setHasStoredSession(!!stored);
          setRawSession(stored);
        }
      } catch {
        if (!cancelled) setHasStoredSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 3) Setup: provider -> switch network -> fetch info -> choose (session key restore) OR (embedded wallet)
  useEffect(() => {
    let cancelled = false;

    async function setupWallet() {
      if (!embeddedWallet) return;

      try {
        setError(null);
        setBalanceEth(null);
        setChainId(null);
        setKernelAddress(null);
        setKernelChainId(null);
        setNeedsApproval(false);

        console.log("Wallet address:", embeddedWallet.address);

        console.log("[1] get provider");
        const eip1193 = await embeddedWallet.getProvider();

        console.log("[2] ensure Base Sepolia");
        await ensureBaseSepolia(eip1193);

        console.log("[3] read chainId");
        const current = (await eip1193.request({ method: "eth_chainId" })) as string;
        console.log("Connected chain:", current, chainName(current));
        if (!cancelled) setChainId(current);

        console.log("[4] fetch balance via eth_getBalance (no ethers)");
        const balHex = (await eip1193.request({
          method: "eth_getBalance",
          params: [embeddedWallet.address, "latest"],
        })) as string;

        if (!cancelled) setBalanceEth(weiHexToEthString(balHex));
        console.log("[5] balance ok:", balHex);

        // 5) Try restore session-key account first (NO POPUPS)
        const stored = await getStoredSessionKey();

        if (stored) {
          console.log("[6] restoring session-key kernel account (no popups)");
          // keep a copy of the raw serialized session for UI/debug
          setRawSession(stored);
          const { account, kernelClient } = await createKernelClientFromSerializedSessionKey(stored);

          console.log("✅ Session-key Kernel address:", account.address);
          console.log("✅ Kernel chain:", (kernelClient.chain as any)?.id);

          if (!cancelled) {
            setKernelAddress(account.address);
            setKernelChainId((kernelClient.chain as any)?.id ?? null);
            setHasStoredSession(true);
          }
          return;
        }

        // 6) No session key stored yet → create embedded-wallet-controlled account (sudo)
        console.log("[6] no session key stored -> creating sudo kernel client (embedded wallet)");
        const { account, kernelClient } = await createKernelClientWithEmbeddedWallet(
          eip1193,
          embeddedWallet.address
        );

  console.log("✅ Sudo Kernel address:", account.address);
  console.log("✅ Kernel chain:", (kernelClient.chain as any)?.id);

        if (!cancelled) {
          setKernelAddress(account.address);
          setKernelChainId((kernelClient.chain as any)?.id ?? null);
          setHasStoredSession(false);
          setNeedsApproval(true); // show “Approve Session Key” button
        }
      } catch (e: any) {
        console.warn("setupWallet failed:", e);
        if (!cancelled) setError(e?.message ?? "Failed to setup wallet");
      }
    }

    setupWallet();
    return () => {
      cancelled = true;
    };
  }, [embeddedWallet]);

  async function onApproveSessionKey() {
    if (!embeddedWallet) return;
    try {
      setError(null);
      setApproving(true);

      const eip1193 = await embeddedWallet.getProvider();
      await ensureBaseSepolia(eip1193);

      // This call triggers the one-time “approval” signature (sudo/Privy).
      const { account, kernelClient, serializedSessionKey } = await createAndApproveSessionKeyAccount({
        embeddedProvider: eip1193,
        ownerAddress: embeddedWallet.address,
        // Optional: provide tighter permissions here later
      });

      await setStoredSessionKey(serializedSessionKey);

  // update UI with serialized session for debugging/display
  setRawSession(serializedSessionKey ?? null);

      setKernelAddress(account.address);
  setKernelChainId((kernelClient.chain as any)?.id ?? null);
      setHasStoredSession(true);
      setNeedsApproval(false);

      Alert.alert("Session Key Enabled", "Future transactions will use the session key (no popups).");
    } catch (e: any) {
      console.warn("approve session key failed:", e);
      setError(e?.message ?? "Failed to approve session key");
    } finally {
      setApproving(false);
    }
  }

  async function onResetSessionKey() {
    await clearStoredSessionKey();
    setHasStoredSession(false);
    setNeedsApproval(true);
    setRawSession(null);
    Alert.alert("Session Key Removed", "You removed the stored session key. Approve again to go popup-free.");
  }

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Image source={require("../assets/images/loginAppIcon.png")} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={28} color="#b00020" />
        </TouchableOpacity>
      </View>

      {creating ? <Text style={styles.info}>Creating embedded wallet...</Text> : null}
      {email ? <Text style={styles.subtle}>Signed in as {email}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Balance card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total Balance</Text>
        <Text style={styles.balanceValue}>{balanceEth == null ? "Loading..." : `${balanceEth} ETH`}</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Alert.alert("Add Funds", "Connect this to a faucet/onramp later.")}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={32} color="#4b2996" style={styles.actionIcon} />
            <Text style={styles.actionText}>Add Funds</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Alert.alert("Send", "Connect this to your send flow.")}
          >
            <MaterialCommunityIcons name="send" size={32} color="#4b2996" style={styles.actionIcon} />
            <Text style={styles.actionText}>Send</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Alert.alert("Swap", "Connect this to your swap flow.")}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={32} color="#4b2996" style={styles.actionIcon} />
            <Text style={styles.actionText}>Swap</Text>
          </TouchableOpacity>
        </View>

        {/* Session Key CTA */}
        {needsApproval ? (
          <TouchableOpacity
            style={[styles.primaryBtn, approving ? styles.primaryBtnDisabled : null]}
            onPress={onApproveSessionKey}
            disabled={approving}
          >
            <Text style={styles.primaryBtnText}>
              {approving ? "Approving Session Key..." : "Approve Session Key (One-Time)"}
            </Text>
          </TouchableOpacity>
        ) : null}

        {hasStoredSession ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onResetSessionKey}>
            <Text style={styles.secondaryBtnText}>Remove Stored Session Key</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.cardLabel}>Privy Wallet Address</Text>
        <Text style={styles.cardValue}>{embeddedWallet?.address ?? "Loading..."}</Text>

        <Text style={styles.cardLabel}>Network</Text>
        <Text style={styles.cardValue}>{chainId ? chainName(chainId) : "Loading..."}</Text>

        <Text style={styles.cardLabel}>Kernel Address</Text>
        <Text style={styles.cardValue}>{kernelAddress ?? "Loading..."}</Text>

        <Text style={styles.cardLabel}>Kernel Client Chain</Text>
        <Text style={styles.cardValue}>{kernelChainId != null ? String(kernelChainId) : "Loading..."}</Text>

        <Text style={styles.cardLabel}>Session Key Stored</Text>
        <Text style={styles.cardValue}>
          {hasStoredSession == null ? "Checking..." : hasStoredSession ? "Yes (popup-free)" : "No"}
        </Text>

        {rawSession ? (
          <TouchableOpacity
            style={{ marginTop: 8 }}
            onPress={() => setShowSessionJson((s) => !s)}
          >
            <Text style={{ color: "#4b2996", fontWeight: "700" }}>
              {showSessionJson ? "Hide session JSON" : "Show session JSON"}
            </Text>
          </TouchableOpacity>
        ) : null}

        {showSessionJson && rawSession ? (
          <View style={{ marginTop: 8, width: "100%" }}>
            <Text style={styles.sessionText} selectable>
              {(() => {
                try {
                  const parsed = JSON.parse(rawSession);
                  return JSON.stringify(parsed, null, 2);
                } catch {
                  return rawSession;
                }
              })()}
            </Text>
          </View>
        ) : null}
      </View>

      {!embeddedWallet && (
        <Text style={styles.info}>No embedded wallet yet. It will be created after login.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: "#f7f6fb",
    alignItems: "center",
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingHorizontal: 24,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#fff",
    backgroundColor: "transparent",
  },
  logo: {
    width: 120,
    height: 40,
  },
  logoutBtn: {
    padding: 6,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  subtle: {
    color: "#666",
    marginTop: -8,
    marginBottom: 6,
    fontSize: 13,
  },
  card: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginTop: 12,
    marginBottom: 18,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 18,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  actionText: {
    fontSize: 13,
    color: "#222",
    fontWeight: "500",
  },
  actionIcon: {
    marginBottom: 6,
  },
  infoCard: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginTop: 0,
  },
  cardLabel: {
    color: "#888",
    fontSize: 13,
    marginTop: 10,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#222",
    marginTop: 2,
    textAlign: "center",
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#4b2996",
    marginTop: 8,
    marginBottom: 4,
  },
  info: { color: "#666", marginTop: 18, fontSize: 15 },
  error: { color: "#b00020", marginTop: 8 },

  primaryBtn: {
    marginTop: 16,
    width: "100%",
    backgroundColor: "#4b2996",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryBtn: {
    marginTop: 10,
    width: "100%",
    backgroundColor: "#eee",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#333",
    fontWeight: "700",
    fontSize: 13,
  },
  sessionText: {
    fontSize: 12,
    color: "#222",
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#fafafa',
    padding: 10,
    borderRadius: 8,
    maxHeight: 220,
    overflow: 'hidden',
  },
});
