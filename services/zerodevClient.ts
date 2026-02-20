// services/zerodevClient.ts

import {
    createPublicClient,
    http,
    toHex,
    type Address,
    type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount, toAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";
import { getEntryPoint } from "@zerodev/sdk/constants";

import {
  deserializeSessionKeyAccount,
  serializeSessionKeyAccount,
  signerToSessionKeyValidator,
} from "@zerodev/session-key";

/**
 * ================================
 * CONFIG
 * ================================
 */
const ZERODEV_BUNDLER_RPC =
  "https://rpc.zerodev.app/api/v3/b3b0afd3-1a82-4428-b36a-de11835515ae/chain/84532";

const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

/**
 * Session keys package (@zerodev/session-key) supports EntryPoint 0.6 only.
 * So we use EntryPoint 0.6 + Kernel v2.4 here.
 * Docs: session keys page states EP0.6 only and points EP0.7 users to permissions. :contentReference[oaicite:1]{index=1}
 */
const entryPoint = getEntryPoint("0.6");
const kernelVersion = "0.2.4" as any; // Kernel v2.4

export function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC),
  });
}

/**
 * Build a Viem Account that signs through Privy (EIP-1193 provider).
 */
export function makePrivyViemAccount(embeddedProvider: any, ownerAddress: string) {
  const address = ownerAddress as Address;

  return toAccount({
    address,

    async signMessage({ message }) {
      const data: Hex =
        typeof message === "string" ? toHex(message) : (message.raw as Hex);

      return (await embeddedProvider.request({
        method: "personal_sign",
        params: [data, address],
      })) as Hex;
    },

    async signTypedData(typedData) {
      return (await embeddedProvider.request({
        method: "eth_signTypedData_v4",
        params: [address, JSON.stringify(typedData)],
      })) as Hex;
    },

    async signTransaction() {
      throw new Error("signTransaction not supported (AA only)");
    },
  });
}

/**
 * Create a Kernel client controlled by Privy embedded wallet (sudo validator).
 * (This can prompt popups for every tx if you keep using this long-term.)
 */
export async function createKernelClientWithEmbeddedWallet(
  embeddedProvider: any,
  ownerAddress: string
) {
  const publicClient = getPublicClient();

  const viemAccount = makePrivyViemAccount(embeddedProvider, ownerAddress);

  const sudoValidator = await signerToEcdsaValidator(publicClient, {
    signer: viemAccount,
    entryPoint,
    kernelVersion,
  });

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: sudoValidator },
    entryPoint,
    kernelVersion,
  });

  const kernelClient = await createKernelAccountClient({
    account,
    chain: baseSepolia,
    bundlerTransport: http(ZERODEV_BUNDLER_RPC),
    client: publicClient,
  } as any);

  return { publicClient, account, kernelClient };
}

/**
 * FIRST-LOGIN FLOW:
 * 1) generate session private key (on device)
 * 2) create session key validator with permissions
 * 3) create kernel account with { sudo: privy, regular: sessionKey }
 * 4) serialize session key account (includes enable signature + init params + privateKey)
 *
 * This is the one-time “Approve Session Key” step. It requires a signature from the sudo (Privy) signer.
 */
export async function createAndApproveSessionKeyAccount(params: {
  embeddedProvider: any;
  ownerAddress: string;
  sessionKeyData?: any;
}) {
  const { embeddedProvider, ownerAddress } = params;

  const publicClient = getPublicClient();
  const viemOwner = makePrivyViemAccount(embeddedProvider, ownerAddress);

  const sudoValidator = await signerToEcdsaValidator(publicClient, {
    signer: viemOwner,
    entryPoint,
    kernelVersion,
  });

  // Generate a random session key on device
  const sessionPrivateKey = generatePrivateKey();
  const sessionLocalAccount = privateKeyToAccount(sessionPrivateKey);

  // Basic default permissions:
  // - validAfter: now
  // - validUntil: 30 days
  // - permissions: empty => effectively no call restrictions (DEMO)
  // IMPORTANT: lock this down for production.
  const nowSec = Math.floor(Date.now() / 1000);
  const defaultSessionKeyData: any = {
    validAfter: nowSec,
    validUntil: nowSec + 30 * 24 * 60 * 60,
    // permissions: [] means no call restrictions in this validator (demo-friendly)
    permissions: [],
  } as any;

  const sessionKeyValidator = await signerToSessionKeyValidator(publicClient as any, {
    signer: sessionLocalAccount,
    validatorData: params.sessionKeyData ?? defaultSessionKeyData,
    entryPoint,
    kernelVersion,
  });

  // Kernel account with sudo(owner) + regular(session key)
  const account = await createKernelAccount(publicClient, {
    plugins: {
      sudo: sudoValidator,
      regular: sessionKeyValidator,
    },
    entryPoint,
    kernelVersion,
  });

  // Create a client for this account (it will sign UserOps with the session key for regular paths)
  const kernelClient = await createKernelAccountClient({
    account,
    chain: baseSepolia,
    bundlerTransport: http(ZERODEV_BUNDLER_RPC),
    client: publicClient,
  } as any);

  // Serialize for storage (includes privateKey so restore is fully popup-free)
  // serializeSessionKeyAccount requires the account’s plugin manager to be session-key based. :contentReference[oaicite:2]{index=2}
  const serialized = await serializeSessionKeyAccount(account as any, sessionPrivateKey as any);

  return {
    publicClient,
    account,
    kernelClient,
    serializedSessionKey: serialized,
  };
}

/**
 * RETURNING-USER FLOW (NO POPUPS):
 * Restore a session-key kernel account from serialized string.
 * deserializeSessionKeyAccount requires EP0.6. :contentReference[oaicite:3]{index=3}
 */
export async function createKernelClientFromSerializedSessionKey(serializedSessionKey: string) {
  const publicClient = getPublicClient();

  const restoredAccount = await deserializeSessionKeyAccount(
    publicClient as any,
    entryPoint,
    kernelVersion,
    serializedSessionKey
  );

  const kernelClient = await createKernelAccountClient({
    account: restoredAccount as any,
    chain: baseSepolia,
    bundlerTransport: http(ZERODEV_BUNDLER_RPC),
    client: publicClient,
  } as any);

  return { publicClient, account: restoredAccount, kernelClient };
}
