/**
 * Supabase client for React Native (Expo).
 *
 * Used only for the **passwordless email OTP** flow:
 *   - signInWithOtp({ email })       → emails a 6-digit code
 *   - verifyOtp({ email, token, type: 'email' }) → returns a Session
 *
 * Config can come from one of two places (runtime override wins):
 *   1. SecureStore — set via the in-app config sheet in `app/email-auth.tsx`.
 *      No rebuild required. Best for dev / first-time setup.
 *   2. Env vars EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY.
 *      Baked into the bundle — required for production builds.
 *
 * After OTP verification, the email-auth screen exchanges the Supabase
 * access_token for a backend JWT via `POST /auth/exchange`. If that endpoint
 * isn't deployed yet, we fall back to the Supabase token directly (and warn).
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';


const ENV_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://npohpfnbndurvxdciivh.supabase.co';
const ENV_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wb2hwZm5ibmR1cnZ4ZGNpaXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTYwNTEsImV4cCI6MjA5MzYzMjA1MX0.Tj42kRzrLah_HQ8-a4WeICd7-GgN3VM1fdIXODab2_U';

let runtimeUrl: string | null = null;
let runtimeKey: string | null = null;
let _client: SupabaseClient | null = null;

const subscribers = new Set<(configured: boolean) => void>();

function resolveUrl(): string {
  return (runtimeUrl ?? ENV_URL).trim();
}
function resolveKey(): string {
  return (runtimeKey ?? ENV_KEY).trim();
}

export function isSupabaseConfigured(): boolean {
  return resolveUrl().length > 0 && resolveKey().length > 0;
}

/**
 * Apply a runtime config (from the in-app sheet). Resets the cached client
 * so the next call uses the new values. Pass `null` to clear the override
 * and fall back to env vars.
 */
export function setSupabaseConfigOverride(
  url: string | null,
  anonKey: string | null
): void {
  runtimeUrl = url ? url.trim() : null;
  runtimeKey = anonKey ? anonKey.trim() : null;
  _client = null;
  const configured = isSupabaseConfigured();
  subscribers.forEach(fn => fn(configured));
}

export function subscribeSupabaseConfigured(
  fn: (configured: boolean) => void
): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/**
 * Lazily instantiate so the app doesn't crash on boot if env vars are missing
 * — the email-auth screen surfaces a friendly error / config sheet instead.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Tap "Configure" on the email sign-in screen to add your URL + anon key.'
    );
  }
  if (_client) return _client;
  _client = createClient(resolveUrl(), resolveKey(), {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // We aren't using URL-based callbacks (no deep links / magic links —
      // OTP only). Detecting session in URL would trip on garbage in dev.
      detectSessionInUrl: false,
    },
  });
  return _client;
}

/** Best-effort sign-out of any cached Supabase session. Safe to call even if Supabase is unconfigured. */
export async function supabaseSignOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await getSupabase().auth.signOut({ scope: 'local' });
  } catch {
    /* ignore — local session may already be gone */
  }
}

// ─── Back-compat shim ──────────────────────────────────────────────────────
// Older imports referenced a const flag. Keep it for one release as the
// initial value; live code should call `isSupabaseConfigured()` for the
// post-override truth.
/** @deprecated use `isSupabaseConfigured()` instead. */
export const SUPABASE_CONFIGURED = isSupabaseConfigured();
