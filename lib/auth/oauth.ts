import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import {
  OAUTH_FORWARD_REDIRECT,
  OAUTH_REDIRECT,
  getGoogleAuthUrl,
  getLinkedInAuthUrl,
} from '../api/config';
import { AuthApi } from '../api/auth';

WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'linkedin' | 'google';

export interface OAuthResult {
  token: string;
}

const PROVIDER_URL: Record<OAuthProvider, () => string> = {
  linkedin: getLinkedInAuthUrl,
  google: getGoogleAuthUrl,
};

/**
 * Open the backend's OAuth URL for the given provider in a secure browser session.
 *
 * Expected backend flow (either pattern is supported):
 *   A) Backend redirects back to `tedxpune://auth/callback?token=<jwt>`
 *      → we extract `token` from the URL.
 *   B) Backend redirects to `tedxpune://auth/callback?code=<code>&state=<state>`
 *      → we exchange the code via /auth/<provider>/callback.
 */
export async function signInWithProvider(
  provider: OAuthProvider
): Promise<OAuthResult> {
  const base = PROVIDER_URL[provider]();
  // Only forward a redirect_uri when the backend explicitly supports it.
  // Forwarding a custom scheme to Google/LinkedIn → provider 400 "malformed".
  const authUrl = OAUTH_FORWARD_REDIRECT
    ? `${base}?redirect_uri=${encodeURIComponent(OAUTH_REDIRECT)}`
    : base;

  // `OAUTH_REDIRECT` here is just the URL the in-app browser watches for to
  // know the flow finished — it is NOT sent to the server.
  const result = await WebBrowser.openAuthSessionAsync(authUrl, OAUTH_REDIRECT, {
    showInRecents: false,
    preferEphemeralSession: true,
  });

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Sign-in was cancelled.');
  }
  if (result.type !== 'success' || !result.url) {
    throw new Error('Sign-in failed. Please try again.');
  }

  const parsed = Linking.parse(result.url);
  const params = parsed.queryParams ?? {};

  // Pattern A: token came back directly
  const token = (params.token || params.accessToken) as string | undefined;
  if (token) return { token };

  // Pattern B: exchange the code with the backend
  const code = params.code as string | undefined;
  const state = params.state as string | undefined;
  if (code) {
    const resp = await AuthApi.exchangeCode(code, state, provider);
    return { token: resp.accessToken };
  }

  throw new Error('OAuth callback did not include a token or code.');
}

export const signInWithLinkedIn = () => signInWithProvider('linkedin');
export const signInWithGoogle = () => signInWithProvider('google');
