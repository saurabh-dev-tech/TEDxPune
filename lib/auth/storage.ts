import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Secure JWT storage.
 * - iOS: Keychain
 * - Android: EncryptedSharedPreferences
 * - Web: falls back to localStorage (SecureStore is native-only)
 */

const TOKEN_KEY = 'tedxpune.accessToken';
const API_URL_KEY = 'tedxpune.apiUrl';
const SUPABASE_URL_KEY = 'tedxpune.supabaseUrl';
const SUPABASE_KEY_KEY = 'tedxpune.supabaseAnonKey';

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
    }
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Persisted API base URL override — set from the dev config sheet. */
export async function saveApiUrl(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(API_URL_KEY, url);
    }
    return;
  }
  await SecureStore.setItemAsync(API_URL_KEY, url);
}

export async function getStoredApiUrl(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(API_URL_KEY);
  }
  return SecureStore.getItemAsync(API_URL_KEY);
}

export async function clearStoredApiUrl(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(API_URL_KEY);
    }
    return;
  }
  await SecureStore.deleteItemAsync(API_URL_KEY);
}

/** Persisted Supabase config override — set from the email-auth config sheet. */
export interface StoredSupabaseConfig {
  url: string;
  anonKey: string;
}

export async function saveSupabaseConfig(cfg: StoredSupabaseConfig): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SUPABASE_URL_KEY, cfg.url);
      window.localStorage.setItem(SUPABASE_KEY_KEY, cfg.anonKey);
    }
    return;
  }
  await Promise.all([
    SecureStore.setItemAsync(SUPABASE_URL_KEY, cfg.url),
    SecureStore.setItemAsync(SUPABASE_KEY_KEY, cfg.anonKey),
  ]);
}

export async function getStoredSupabaseConfig(): Promise<StoredSupabaseConfig | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    const url = window.localStorage.getItem(SUPABASE_URL_KEY);
    const anonKey = window.localStorage.getItem(SUPABASE_KEY_KEY);
    return url && anonKey ? { url, anonKey } : null;
  }
  const [url, anonKey] = await Promise.all([
    SecureStore.getItemAsync(SUPABASE_URL_KEY),
    SecureStore.getItemAsync(SUPABASE_KEY_KEY),
  ]);
  return url && anonKey ? { url, anonKey } : null;
}

export async function clearStoredSupabaseConfig(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SUPABASE_URL_KEY);
      window.localStorage.removeItem(SUPABASE_KEY_KEY);
    }
    return;
  }
  await Promise.all([
    SecureStore.deleteItemAsync(SUPABASE_URL_KEY),
    SecureStore.deleteItemAsync(SUPABASE_KEY_KEY),
  ]);
}
