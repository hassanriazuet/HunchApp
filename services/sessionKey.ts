import type { PublicClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// ZeroDev session key helpers
import {
    deserializeSessionKeyAccount,
    // names may vary slightly by SDK version, but the flow is:
    // 1) create session key validator with policies
    // 2) create kernel account with sudo + session
    // 3) serialize session key account for storage
    serializeSessionKeyAccount,
} from "@zerodev/session-key";

// you will already have: a publicClient + sudo-based kernel account creation in your zerodevClient.ts
// This function assumes you can build:
// - a sudo validator from the embedded wallet signer
// - a session key validator from session private key + permissions
export async function createAndStoreSessionKey({
  publicClient,
  createSessionKeyKernelAccount, // you implement: returns a Kernel account configured with sudo+session
  sessionPolicies,               // your “what/when” permissions
}: {
  publicClient: PublicClient;
  createSessionKeyKernelAccount: (args: {
    publicClient: PublicClient;
    sessionPrivateKey: `0x${string}`;
    sessionPolicies: any;
  }) => Promise<{ sessionKeyAccount: any; sessionPrivateKey: `0x${string}` }>;
  sessionPolicies: any;
}) {
  const sessionPrivateKey = generatePrivateKey(); // one-time random key on device
  const sessionOwner = privateKeyToAccount(sessionPrivateKey);

  // Build the Kernel account that uses:
  // - sudo validator = your embedded wallet (Privy) owner
  // - regular validator = sessionKeyValidator(sessionOwner + policies)
  //
  // IMPORTANT: This step triggers the ONE-TIME signature from the embedded wallet.
  const { sessionKeyAccount } = await createSessionKeyKernelAccount({
    publicClient,
    sessionPrivateKey,
    sessionPolicies,
  });

  // Serialize for storage so we can restore later without embedded wallet prompts.
  const serialized = await serializeSessionKeyAccount(sessionKeyAccount, sessionPrivateKey);
  return { serialized };
}

export async function restoreSessionKeyAccount(publicClient: PublicClient, serialized: string) {
  return await deserializeSessionKeyAccount(publicClient, serialized);
}
