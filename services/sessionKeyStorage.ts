// services/sessionKeyStorage.ts
import * as SecureStore from "expo-secure-store";

const KEY = "hunch.sessionKey.serialized.v1";

/**
 * Web: localStorage
 * Native: expo-secure-store
 */

function hasWebLocalStorage(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w: any = typeof window !== "undefined" ? window : undefined;
  return !!w?.localStorage;
}

export async function getStoredSessionKey(): Promise<string | null> {
  if (hasWebLocalStorage()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w: any = window;
    return w.localStorage.getItem(KEY);
  }

  return await SecureStore.getItemAsync(KEY);
}

export async function setStoredSessionKey(value: string): Promise<void> {
  if (hasWebLocalStorage()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w: any = window;
    w.localStorage.setItem(KEY, value);
    return;
  }

  await SecureStore.setItemAsync(KEY, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export async function clearStoredSessionKey(): Promise<void> {
  if (hasWebLocalStorage()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w: any = window;
    w.localStorage.removeItem(KEY);
    return;
  }

  await SecureStore.deleteItemAsync(KEY);
}
