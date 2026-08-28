import { api } from './client';
import type { AuthResponse } from './types';

/**
 * Initiates LinkedIn OAuth.
 * Mobile clients typically open the LinkedIn auth URL in a browser
 * (see `lib/auth/oauth.ts`); this is a thin wrapper for completeness.
 */
export const AuthApi = {
  /**
   * Exchange an OAuth callback `code` for an access token.
   * Used when the backend supports a JSON-style code exchange.
   */
  exchangeCode: (code: string, state?: string, provider: 'linkedin' | 'google' = 'linkedin') =>
    api.get<AuthResponse>(`/auth/${provider}/callback`, {
      query: { code, state },
      noAuth: true,
    }),
};

/**
 * Exchange a third-party token (e.g. a Supabase access_token issued after an
 * email-OTP flow) for a backend-issued JWT that's valid against /users/me,
 * /posts, etc.
 *
 * Expected backend contract:
 *   POST /auth/exchange
 *     body: { supabaseToken: string }
 *     → 200 { accessToken: "<backend JWT>" }
 *     → 401 if the Supabase token is invalid or the user isn't allowed in
 *     → 404 if the endpoint isn't deployed yet (we fall back gracefully)
 */
export const ExchangeApi = {
  fromSupabase: (supabaseToken: string) =>
    api.post<AuthResponse>(
      '/auth/exchange',
      { supabaseToken, provider: 'supabase' },
      { noAuth: true }
    ),
};

/**
 * Email + one-time-code sign-in.
 *
 * Assumed backend contract (mirrors common OTP/passwordless flows):
 *   POST /auth/email/request     body: { email }
 *     → 200/204 (server emails a 6-digit code)
 *     → 429 if rate-limited
 *
 *   POST /auth/email/verify      body: { email, code }
 *     → 200 with { accessToken }
 *     → 400 / 401 if code is wrong or expired
 *
 * If the backend uses different paths, only this module needs to change
 * — the UI in app/email-auth.tsx is path-agnostic.
 *
 * Swap-in for Supabase, if you ever wire it up:
 *   requestOtp(email) → supabase.auth.signInWithOtp({ email })
 *   verifyOtp(email, code) → supabase.auth.verifyOtp({ email, token: code, type: 'email' })
 *     then exchange the Supabase access_token at a backend `/auth/exchange`
 *     endpoint so backend protected routes accept it.
 */
export const EmailAuthApi = {
  requestOtp: (email: string) =>
    api.post<{ success?: boolean; message?: string } | null>(
      '/auth/send-otp',
      { email },
      { noAuth: true }
    ),

  verifyOtp: (email: string, code: string) =>
    api.post<AuthResponse>(
      '/auth/verify-otp',
      { email, code },
      { noAuth: true }
    ),
};
