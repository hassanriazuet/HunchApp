import AsyncStorage from '@react-native-async-storage/async-storage';

// ZeroDev project configuration (Base Sepolia testnet)
export const ZERODEV_PROJECT_ID = 'b3b0afd3-1a82-4428-b36a-de11835515ae';
export const ZERODEV_BUNDLER_RPC = 'https://rpc.zerodev.app/api/v3/b3b0afd3-1a82-4428-b36a-de11835515ae/chain/84532';
export const ZERODEV_PAYMASTER_RPC = 'https://rpc.zerodev.app/api/v3/b3b0afd3-1a82-4428-b36a-de11835515ae/chain/84532?selfFunded=true';
export const ZERODEV_CHAIN_ID = 84532;

const SESSION_KEY_STORAGE_KEY = 'zerodev_session_key';

export async function isZeroDevAvailable() {
  try {
    // try to dynamically import the SDK packages (avoid TS resolution errors)
    // @ts-ignore
    const sdk = await import('@zerodev/sdk').catch(() => null);
    // @ts-ignore
    const sk = await import('@zerodev/session-key').catch(() => null);
    // @ts-ignore
    const perms = await import('@zerodev/permissions').catch(() => null);
    return true;
  } catch (e) {
    return false;
  }
}

export async function getStoredSessionKey() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to read session key from storage', e);
    return null;
  }
}

export async function storeSessionKey(session: any) {
  try {
    await AsyncStorage.setItem(SESSION_KEY_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to store session key', e);
  }
}

// Remove the stored session key from AsyncStorage. Useful for testing/iteration.
export async function clearSessionKey() {
  try {
    await AsyncStorage.removeItem(SESSION_KEY_STORAGE_KEY);
    console.log('Cleared ZeroDev session key from AsyncStorage');
  } catch (e) {
    console.warn('Failed to clear session key', e);
  }
}

/**
 * Request session key approval flow.
 * - embeddedProvider: an EIP-1193 provider (e.g., from Privy's embedded wallet)
 * - options: { permissions, expiration, spendLimit }
 *
 * NOTE: This function performs a dynamic import of @zerodev/sdk and related
 * packages. Install the packages listed in the project README before calling
 * this in the running app:
 *
 * npm install @zerodev/sdk @zerodev/ecdsa-validator @zerodev/permissions @zerodev/session-key permissionless viem
 */
export async function requestSessionKeyApproval(embeddedProvider: any, options: any = {}) {
  try {
    // Dynamic-import the ZeroDev SDK pieces we'll try to use.
    // Dynamic imports for ZeroDev packages. Use ts-ignore because these
    // optional SDK packages may not be installed in all environments and
    // we want to avoid a hard TypeScript module resolution error at compile time.
    // @ts-ignore
    const sdkImport = await import('@zerodev/sdk').catch((e) => {
      console.warn('Could not import @zerodev/sdk', e?.message ?? e);
      return null;
    });
    // @ts-ignore
    const sessionKeyImport = await import('@zerodev/session-key').catch((e) => {
      console.warn('Could not import @zerodev/session-key', e?.message ?? e);
      return null;
    });
    // @ts-ignore
    const permissionsImport = await import('@zerodev/permissions').catch((e) => {
      console.warn('Could not import @zerodev/permissions', e?.message ?? e);
      return null;
    });

    const [sdkModule, sessionKeyModule, permissionsModule] = [sdkImport, sessionKeyImport, permissionsImport];

    if (!sdkModule) {
      throw new Error('ZeroDev SDK not available. Install @zerodev/sdk and related packages.');
    }

    // Diagnostic: dump top-level export keys to help identify API shape/version at runtime
    try {
      console.log('ZeroDev SDK top-level exports:', Object.keys(sdkModule));
    } catch (e) {
      console.warn('Failed to list ZeroDev SDK exports', e);
    }
    try {
      console.log('ZeroDev session-key module exports:', sessionKeyModule ? Object.keys(sessionKeyModule) : 'none');
    } catch (e) {
      console.warn('Failed to list session-key exports', e);
    }

    // Build an owner "signer" object from the EIP-1193 embedded provider.
    // Prefer ethers if available for compatibility with many SDK helpers.
    let ownerSigner: any = null;
    let ownerAddress: string | null = null;
    try {
      const ethers = await import('ethers').catch(() => null);
      if (ethers && embeddedProvider) {
        console.log('Creating ethers Web3Provider from embedded provider');
        // cast to any to avoid mismatches between ethers v5/v6 typings
        const web3Provider = new (ethers as any).providers.Web3Provider(embeddedProvider as any);
        const signer = web3Provider.getSigner();
        ownerAddress = await signer.getAddress().catch(async () => {
          // fallback: request accounts
          const accounts = await embeddedProvider.request?.({ method: 'eth_requestAccounts' }) || [];
          return accounts?.[0] ?? null;
        });
        ownerSigner = signer;
      }
    } catch (e) {
      console.warn('ethers-based signer construction failed', e);
      ownerSigner = null;
    }

    // If ethers wasn't available, create a minimal signer wrapper that uses the
    // embedded provider JSON-RPC methods directly (personal_sign or eth_sign).
    if (!ownerSigner && embeddedProvider) {
      console.log('Falling back to minimal EIP-1193 signer wrapper');
      const accounts = await embeddedProvider.request?.({ method: 'eth_requestAccounts' }).catch(() => null);
      ownerAddress = accounts?.[0] ?? null;

      ownerSigner = {
        // signMessage should return an RPC signature string
        signMessage: async (msg: string) => {
          if (!ownerAddress) throw new Error('No owner address available');
          try {
            // personal_sign expects params [message, address]
            const sig = await embeddedProvider.request({ method: 'personal_sign', params: [msg, ownerAddress] });
            return sig;
          } catch (err) {
            // try eth_sign as a fallback
            return embeddedProvider.request({ method: 'eth_sign', params: [ownerAddress, msg] });
          }
        },
        getAddress: async () => ownerAddress,
      } as any;
    }

    console.log('Owner address for session:', ownerAddress);

    // Try multiple SDK entrypoints to create/get a kernel (smart) account client
    const sdkAny = sdkModule as any;
    let kernelClient: any = null;

    // Prefer constructing the SDK transport wrapper for EIP-1193 providers provided by the SDK
    let transport: any = null;
    try {
      if (typeof sdkAny.KernelEIP1193Provider === 'function') {
        try {
          console.log('Constructing KernelEIP1193Provider transport from embedded provider');
          transport = new sdkAny.KernelEIP1193Provider(embeddedProvider, { chainId: ZERODEV_CHAIN_ID });
          console.log('KernelEIP1193Provider constructed');
        } catch (tErr) {
          console.warn('KernelEIP1193Provider construction failed', tErr);
          transport = null;
        }
      } else {
        console.log('KernelEIP1193Provider not exported by SDK');
      }
    } catch (e) {
      console.warn('Error while attempting to build KernelEIP1193Provider', e);
    }

    // Diagnostic: inspect transport shape
    try {
      if (transport) {
        console.log('Transport keys:', Object.keys(transport));
        // If it exposes an inner provider or transport function, log those too
        if ((transport as any).transport) console.log('transport.transport type:', typeof (transport as any).transport);
        if ((transport as any).provider) console.log('transport.provider keys:', Object.keys((transport as any).provider));
      }
    } catch (e) {
      console.warn('Failed to inspect transport', e);
    }

    // Try to get an SDK-compatible signer if the SDK exposes a helper
    let sdkSigner: any = null;
    try {
      if (typeof sdkAny.toSigner === 'function') {
        try {
          console.log('Converting owner signer/address to SDK signer via toSigner');
          // prefer ownerSigner, otherwise try embeddedProvider or ownerAddress
          const toSignerArg = ownerSigner ?? embeddedProvider ?? ownerAddress;
          sdkSigner = await sdkAny.toSigner(toSignerArg);
          console.log('toSigner produced:', typeof sdkSigner, Object.keys(sdkSigner || {}));
        } catch (sErr) {
          console.warn('sdk.toSigner failed', sErr);
          sdkSigner = null;
        }
      } else {
        console.log('sdk.toSigner not available');
      }
    } catch (e) {
      console.warn('Error while attempting sdk.toSigner', e);
    }

    // Try preferred client constructors with transport when available
    const tryCreateClient = async (fnName: string, params: any) => {
      try {
        if (typeof sdkAny[fnName] === 'function') {
          console.log(`Attempting sdk.${fnName} with params:`, Object.keys(params));
          const res = await sdkAny[fnName](params);
          console.log(`${fnName} succeeded`, { res });
          return res;
        }
      } catch (e) {
        console.warn(`${fnName} failed`, e);
      }
      return null;
    };

    // Candidate constructors to try (pass transport when available). Prefer sdkSigner when present.
    const ownerCandidate = sdkSigner ?? ownerAddress ?? ownerSigner;
    const baseParams = {
      owner: ownerCandidate,
      projectId: ZERODEV_PROJECT_ID,
      bundlerUrl: ZERODEV_BUNDLER_RPC,
      chainId: ZERODEV_CHAIN_ID,
      transport: transport,
    };

    // Try createKernelAccountClient, createKernelAccountV1, createKernelAccountV0_2, createKernelAccount
    const createFns = ['createKernelAccountClient', 'createKernelAccountV1', 'createKernelAccountV0_2', 'createKernelAccount', 'createFallbackKernelAccountClient'];
    for (const fn of createFns) {
      if (kernelClient) break;
      kernelClient = await tryCreateClient(fn, baseParams);
    }

    // If we couldn't construct a kernel client via the top-level SDK helpers,
    // try the local viem-based helper which has been successful in some runtimes
    // (it builds a viem account that signs via the embedded provider and then
    // calls the SDK factories with explicit clients). This is a best-effort
    // fallback before we ask the owner for a manual approval signature.
    if (!kernelClient) {
      try {
        console.log('Trying local viem-based helper createZeroDevKernelClient as a fallback');
        // dynamic import so this file doesn't hard-require the helper in all runtimes
        const helper = (await import('./zerodevClient').catch(() => null)) as any;
        if (helper && typeof helper.createZeroDevKernelClient === 'function') {
          try {
            const ownerAddr = ownerAddress ?? (await ownerSigner?.getAddress?.());
            const created = await helper.createZeroDevKernelClient(embeddedProvider, ownerAddr);
            if (created && created.kernelClient) {
              kernelClient = created.kernelClient;
              console.log('createZeroDevKernelClient succeeded', { kernelAddress: created.account?.address ?? created.account, kernelVersion: created.kernelVersion });
            }
          } catch (e) {
            console.warn('createZeroDevKernelClient failed', e);
          }
        } else {
          console.log('Local helper createZeroDevKernelClient not available');
        }
      } catch (e) {
        console.warn('Error while attempting viem helper fallback', e);
      }
    }

    if (!kernelClient) {
      console.warn('Could not get a kernel client from ZeroDev SDK after trying known helpers and viem helper. Falling back to interactive signature flow.');
    }

    // Prepare session-key validator using the session-key package.
    let validator: any = null;
    if (sessionKeyModule && typeof sessionKeyModule.signerToSessionKeyValidator === 'function') {
      try {
        console.log('Creating session-key validator using signerToSessionKeyValidator');
        // many versions require a second arg (options) — provide chainId as a best-effort
  // call via any to avoid mismatches across package versions/types
  validator = await (sessionKeyModule as any).signerToSessionKeyValidator(ownerSigner, { chainId: ZERODEV_CHAIN_ID });
      } catch (e) {
        console.warn('signerToSessionKeyValidator failed', e);
        validator = null;
      }
    } else {
      console.warn('session-key helper not available or signerToSessionKeyValidator missing');
    }

    // Permissions: either use provided, or a permissive placeholder that should be tightened.
    const permissions = options.permissions ?? null;

    // Now, ask the kernel client to create a session (try multiple method names),
    // or if no kernelClient is available, attempt to build a session object by
    // requesting a one-time approval signature from the owner and composing a
    // session structure that the app can store and later use with ZeroDev bundler.
    let session: any = null;

    if (kernelClient) {
      const tryMethods = ['createSession', 'createSessionKey', 'createSessionKeyFor', 'createDelegatedSession', 'createSessionFor'];
      for (const m of tryMethods) {
        try {
          if (typeof kernelClient[m] === 'function') {
            console.log(`Attempting kernelClient.${m}(...)`);
            // call with a common set of params - many SDKs accept { validator, permissions, expiresIn }
            session = await kernelClient[m]({
              validator,
              permissions: options.permissions,
              expiresIn: options.expiresIn ?? (60 * 60 * 24), // default 1 day
            });
            console.log('Kernel client returned session via', m, session);
            break;
          }
        } catch (e) {
          console.warn(`kernelClient.${m} failed`, e);
        }
      }
    }

    // If kernel client did not produce a session, ask the owner to sign an approval
    // message and persist a small session object that contains the validator info
    // plus the owner's approval signature so we can later construct a bundler request.
    if (!session) {
      console.log('No session from kernel client; performing manual owner approval signature');
      const timestamp = Date.now();
      const approvalPayload = {
        type: 'zerodev_session_approval',
        projectId: ZERODEV_PROJECT_ID,
        createdAt: timestamp,
        permissions: options.permissions ?? null,
        expiresIn: options.expiresIn ?? (60 * 60 * 24),
      };

      const msg = JSON.stringify(approvalPayload);
      let signature = null;
      try {
        if (ownerSigner?.signMessage) {
          signature = await ownerSigner.signMessage(msg);
        } else if (embeddedProvider?.request) {
          const accounts = await embeddedProvider.request({ method: 'eth_requestAccounts' }).catch(() => []);
          const acct = accounts?.[0];
          signature = await embeddedProvider.request({ method: 'personal_sign', params: [msg, acct] });
        }
      } catch (e) {
        console.warn('Owner signature for session approval failed', e);
      }

      session = {
        createdAt: timestamp,
        expiresAt: timestamp + (options.expiresIn ?? (60 * 60 * 24)) * 1000,
        owner: ownerAddress,
        validator: validator ?? null,
        approvalSignature: signature,
        permissions: options.permissions ?? null,
        note: 'MANUAL - holds owner signature and validator metadata. Use with ZeroDev bundler RPC to submit operations.',
      } as any;

      console.log('Constructed manual session object', session);
    }

    // Persist the session
    try {
      await storeSessionKey(session);
      console.log('Stored session key in AsyncStorage');
    } catch (e) {
      console.warn('Failed to persist session', e);
    }

    return session;
  } catch (e: any) {
    console.error('requestSessionKeyApproval failed', e?.message ?? e);
    throw e;
  }
}
