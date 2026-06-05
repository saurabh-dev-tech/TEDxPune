import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API base URL resolution.
 *
 * Order of precedence (highest first):
 *   1. Runtime override set via `setApiBaseUrlOverride()` — typically loaded
 *      from SecureStore on boot or set from the dev config sheet.
 *   2. `EXPO_PUBLIC_API_URL` env var.
 *   3. Auto-derived from Expo's dev server `hostUri` (LAN IP) + port 3000.
 *   4. Platform fallback: `10.0.2.2` on Android, `localhost` on iOS sim/web.
 *
 * Physical devices typically need (1) or (2) — `localhost` from a phone
 * means the phone itself, not your dev machine.
 */

let runtimeOverride: string | null = null;
const subscribers = new Set<(url: string) => void>();

export function setApiBaseUrlOverride(url: string | null): void {
  // Normalize: drop trailing slashes.
  const cleaned = url ? url.replace(/\/+$/, '') : null;
  if (cleaned === runtimeOverride) return;
  runtimeOverride = cleaned;
  const current = getApiBaseUrl();
  subscribers.forEach(fn => fn(current));
}

export function subscribeApiBaseUrl(fn: (url: string) => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function defaultBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants.manifest2 as any)?.extra?.expoGo?.developer?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri && __DEV__) {
    const host = String(hostUri).split(':')[0];
    return `http://${host}:3000/api/v1`;
  }

  const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${fallbackHost}:3000/api/v1`;
}

export function getApiBaseUrl(): string {
  return runtimeOverride ?? defaultBaseUrl();
}

/**
 * Strip the path off the API base URL so we get just `<protocol>//<host>`.
 *
 * Why: the backend mounts OAuth routes at `/auth/<provider>` (NOT under the
 * `/api/v1` prefix), but data routes ARE under `/api/v1`. So if the configured
 * base URL is `http://localhost:3000/api/v1`, we need:
 *   - data calls:  http://localhost:3000/api/v1/users/me
 *   - oauth calls: http://localhost:3000/auth/linkedin
 *
 * `getApiOriginUrl()` returns just the origin so OAuth URLs can be built
 * independently of the API prefix.
 */
export function getApiOriginUrl(): string {
  try {
    const u = new URL(getApiBaseUrl());
    const port = u.port ? `:${u.port}` : '';
    return `${u.protocol}//${u.hostname}${port}`;
  } catch {
    // Fall back to stripping anything after the host segment
    return getApiBaseUrl().replace(/^(https?:\/\/[^/]+).*/, '$1');
  }
}

/** @deprecated Use `getApiBaseUrl()` so runtime overrides apply. Kept for back-compat. */
export const API_BASE_URL = defaultBaseUrl();

export const API_TIMEOUT_MS = 20_000;

// OAuth endpoints sit at the API origin (NOT under /api/v1) on this backend.
export const getLinkedInAuthUrl = () => `${getApiOriginUrl()}/auth/linkedin`;
export const getGoogleAuthUrl = () => `${getApiOriginUrl()}/auth/google`;

/** @deprecated initial values only — use the getters instead. */
export const LINKEDIN_AUTH_URL = getLinkedInAuthUrl();
/** @deprecated initial values only — use the getters instead. */
export const GOOGLE_AUTH_URL = getGoogleAuthUrl();

// Deep-link scheme used as the OAuth redirect target. Must match `scheme` in app.json.
export const APP_SCHEME = 'tedxpune';
export const OAUTH_REDIRECT = `${APP_SCHEME}://auth/callback`;

/** See note in lib/auth/oauth.ts — default off. */
export const OAUTH_FORWARD_REDIRECT =
  process.env.EXPO_PUBLIC_OAUTH_FORWARD_REDIRECT === 'true';
