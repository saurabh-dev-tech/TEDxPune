/**
 * Minimal JWT payload reader.
 *
 * - **No signature verification.** That is the backend's job; the client only
 *   reads what the server already issued. We use this purely to surface the
 *   user's id / name / picture in the UI when /users/me is unavailable.
 * - Hand-rolled base64-url decoder so we don't depend on `atob`/`Buffer`
 *   being available across React Native versions.
 */

const B64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64UrlDecode(input: string): string {
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  // pad to multiple of 4
  while (s.length % 4) s += '=';

  let output = '';
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '=') break;
    const idx = B64_CHARS.indexOf(c);
    if (idx < 0) continue;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

/** Common claims our backend (and most OAuth providers) emit. */
export interface JwtClaims {
  sub?: string;
  email?: string;
  name?: string;
  fullName?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  avatarUrl?: string;
  role?: string;
  tenantId?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

export function decodeJwt(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

export function isJwtExpired(claims: JwtClaims | null | undefined): boolean {
  if (!claims?.exp) return false;
  return claims.exp * 1000 < Date.now();
}

/**
 * Best-effort display name from JWT claims (used as a fallback when
 * the backend's /users/me endpoint isn't available).
 */
export function nameFromClaims(claims: JwtClaims | null | undefined): string | null {
  if (!claims) return null;
  if (claims.fullName) return String(claims.fullName);
  if (claims.name) return String(claims.name);
  if (claims.given_name || claims.family_name) {
    return [claims.given_name, claims.family_name].filter(Boolean).join(' ');
  }
  if (claims.email) {
    const local = String(claims.email).split('@')[0];
    return local.replace(/[._-]+/g, ' ');
  }
  return null;
}

export function pictureFromClaims(claims: JwtClaims | null | undefined): string | null {
  if (!claims) return null;
  return (claims.picture as string) || (claims.avatarUrl as string) || null;
}
