import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView, type WebViewNavigation, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { C, Fonts } from '@/constants/theme';
import { getApiBaseUrl, getGoogleAuthUrl, getLinkedInAuthUrl } from '@/lib/api/config';
import { useAuth } from '@/lib/auth/context';

const LOOPBACK_RE = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2)$/i;

/**
 * Rewrite any loopback host (localhost / 127.0.0.1 / Android emulator alias)
 * to point at the user's configured API host. The backend's OAuth callback
 * is often registered as a localhost URL — on a physical device that URL
 * fails DNS, so we transparently swap the host on navigation.
 */
function rewriteLoopbackHost(originalUrl: string): string | null {
  try {
    const u = new URL(originalUrl);
    if (!LOOPBACK_RE.test(u.hostname)) return null;
    const base = new URL(getApiBaseUrl());
    u.protocol = base.protocol;
    u.hostname = base.hostname;
    u.port = base.port;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * OAuth WebView screen.
 *
 * The backend's `/auth/<provider>/callback` returns a JSON body
 * `{ accessToken: "..." }` instead of redirecting to a deep link, so
 * `expo-web-browser.openAuthSessionAsync` can't auto-close.
 *
 * This screen loads the OAuth flow in a WebView, watches for the
 * callback URL, scrapes the JSON, and hands the token to AuthContext.
 */

// Inject this JS once we land on the callback URL — it reads the JSON
// body the server rendered as plain text and posts it back to RN.
const EXTRACT_TOKEN_JS = `
  (function() {
    try {
      var text = (document.body && document.body.innerText) || '';
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'callback',
        body: text,
      }));
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        message: String(e && e.message || e),
      }));
    }
  })();
  true;
`;

function authUrlFor(provider: string): string | null {
  if (provider === 'linkedin') return getLinkedInAuthUrl();
  if (provider === 'google') return getGoogleAuthUrl();
  return null;
}

function isCallbackUrl(url: string, provider: string): boolean {
  return url.includes(`/auth/${provider}/callback`);
}

function parseTokenFromBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    const json = JSON.parse(trimmed);
    return json.accessToken ?? json.token ?? null;
  } catch {
    // Fallback regex for HTML-wrapped JSON
    const m = trimmed.match(/"accessToken"\s*:\s*"([^"]+)"/);
    return m ? m[1] : null;
  }
}

export default function OAuthScreen() {
  const router = useRouter();
  const { provider } = useLocalSearchParams<{ provider: string }>();
  const { signInWithToken } = useAuth();

  const url = authUrlFor(provider);
  const webRef = useRef<any>(null);
  const [signing, setSigning] = useState(false);
  // The WebView source is controlled, so we can swap it when we want to
  // redirect (e.g. localhost-rewrite) without going through document.location.
  const [currentUrl, setCurrentUrl] = useState<string | null>(url);
  const [loadError, setLoadError] = useState<string | null>(null);
  const handled = useRef(false);

  if (!url) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize: 14, color: C.slate }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sign in</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.center}>
          <Text style={{ color: C.slate }}>Unknown provider.</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Close the modal, then surface an alert from the parent screen so the
   * WebView isn't sitting half-stuck behind it. We use setTimeout so the
   * alert is bound to the screen we're navigating *back* to.
   */
  const failAndDismiss = (title: string, message: string) => {
    if (handled.current) return;
    handled.current = true;
    setSigning(false);
    router.back();
    setTimeout(() => Alert.alert(title, message), 250);
  };

  const finalizeWithToken = async (token: string) => {
    if (handled.current) return;
    handled.current = true;
    setSigning(true);
    try {
      await signInWithToken(token);
      // AuthGate will redirect to /(tabs)
      router.replace('/(tabs)');
    } catch (err: any) {
      setSigning(false);
      router.back();
      const msg = err?.message ?? 'Your account could not be authenticated.';
      setTimeout(() => Alert.alert('Sign-in failed', msg), 250);
    }
  };

  /**
   * Iff the WebView is about to navigate to a loopback host (the backend's
   * registered callback URL almost always points at localhost), swap the
   * host for our configured API host and let the rewritten URL load.
   * Returning false here cancels the original request.
   */
  const handleShouldStart = (req: ShouldStartLoadRequest): boolean => {
    const target = req.url || '';
    if (!target) return true;
    const rewritten = rewriteLoopbackHost(target);
    if (rewritten && rewritten !== target) {
      console.log('[oauth] rewriting loopback host:', target, '→', rewritten);
      setCurrentUrl(rewritten);
      return false;
    }
    return true;
  };

  const handleNavChange = (e: WebViewNavigation) => {
    if (handled.current) return;
    const url = e.url || '';

    // Provider-side OAuth error (user denied, wrong creds redirected back, etc.)
    // Both LinkedIn and Google append `?error=...&error_description=...`.
    if (/[?&]error=/.test(url)) {
      try {
        const u = new URL(url);
        const desc = u.searchParams.get('error_description') || u.searchParams.get('error') || 'Sign-in was cancelled.';
        failAndDismiss('Sign-in cancelled', decodeURIComponent(desc));
      } catch {
        failAndDismiss('Sign-in cancelled', 'Sign-in did not complete.');
      }
      return;
    }

    if (isCallbackUrl(url, String(provider))) {
      // Inject extraction once the callback page finishes loading.
      // We do this in onLoadEnd via the same JS, but trigger here too as a backup.
      webRef.current?.injectJavaScript(EXTRACT_TOKEN_JS);
    }
  };

  /**
   * Handle hard navigation errors (-1003 DNS, -1004 connection refused, etc.).
   * If the URL contained a loopback host, attempt a one-shot rewrite + retry.
   * Otherwise surface a friendly inline error so the user can hit "Configure".
   */
  const handleWebError = (e: { nativeEvent: { url?: string; description?: string; code?: number } }) => {
    const nat = e.nativeEvent || {};
    const failedUrl = nat.url || currentUrl || '';
    const code = nat.code ?? 0;
    // Ignore sub-resource warnings with no URL — those are not fatal.
    if (!failedUrl) return;

    const rewritten = rewriteLoopbackHost(failedUrl);
    if (rewritten && rewritten !== failedUrl && !handled.current) {
      console.log('[oauth] retry with rewritten URL:', rewritten);
      setLoadError(null);
      setCurrentUrl(rewritten);
      return;
    }

    setLoadError(
      `${nat.description || 'Could not load page.'} (code ${code})\n${failedUrl}`
    );
  };

  const handleMessage = (e: WebViewMessageEvent) => {
    if (handled.current) return;
    try {
      const payload = JSON.parse(e.nativeEvent.data);
      if (payload.type === 'callback' && typeof payload.body === 'string') {
        const body = payload.body.trim();
        if (!body) return; // page not finished rendering yet — wait for the next call

        const token = parseTokenFromBody(body);
        if (token) {
          finalizeWithToken(token);
          return;
        }
        // Body had content but no token — try to surface a server error.
        try {
          const parsed = JSON.parse(body);
          const msg = String(parsed?.message || parsed?.error || 'Authentication did not return a token.');
          if (msg.toLowerCase().includes('not part of the tribe')) {
            failAndDismiss('Access Denied', 'You are not part of the tribe. Only ticket holders and whitelisted members can log in.');
          } else {
            failAndDismiss('Sign-in failed', msg);
          }
        } catch {
          failAndDismiss('Sign-in failed', 'Authentication did not return a token.');
        }
      }
    } catch {
      /* ignore malformed messages */
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={signing}>
          <Text style={{ fontSize: 14, color: signing ? C.faint : C.slate }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          Sign in {provider ? `· ${String(provider)}` : ''}
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={{ flex: 1 }}>
        {currentUrl && (
          <WebView
            ref={webRef}
            source={{ uri: currentUrl }}
            onShouldStartLoadWithRequest={handleShouldStart}
            onNavigationStateChange={handleNavChange}
            onLoadEnd={(e: any) => {
              const u = e?.nativeEvent?.url || '';
              if (isCallbackUrl(u, String(provider))) {
                webRef.current?.injectJavaScript(EXTRACT_TOKEN_JS);
              }
            }}
            onMessage={handleMessage}
            onError={handleWebError}
            onHttpError={handleWebError}
            // The callback page is a plain JSON response; iOS sometimes flags
            // this as "non-HTML" — these flags keep navigation flowing.
            originWhitelist={['*']}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            incognito={Platform.OS === 'android'}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={C.red} />
              </View>
            )}
          />
        )}

        {loadError && (
          <View style={styles.errorOverlay}>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.red, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Server unreachable
            </Text>
            <Text style={{ fontFamily: Fonts.serif, fontSize: 22, lineHeight: 26, color: C.ink, marginBottom: 10, textAlign: 'center' }}>
              The OAuth page failed to load.
            </Text>
            <Text style={{ fontSize: 13, color: C.slate, textAlign: 'center', marginBottom: 24 }}>
              {loadError}
            </Text>
            <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 18, lineHeight: 19 }}>
              Make sure the backend is running and reachable from this device.
              Tap <Text style={{ color: C.ink, fontWeight: '600' }}>dev · server</Text> on the login screen to set the correct LAN IP.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.errorBtnSecondary}
                onPress={() => { setLoadError(null); setCurrentUrl(authUrlFor(String(provider))); }}
              >
                <Text style={{ color: C.ink, fontWeight: '600', fontSize: 13 }}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.errorBtnPrimary}
                onPress={() => router.back()}
              >
                <Text style={{ color: C.paper, fontWeight: '600', fontSize: 13 }}>Back to login</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {signing && (
          <View style={styles.signingOverlay} pointerEvents="auto">
            <ActivityIndicator color={C.red} />
            <Text style={{ marginTop: 14, color: C.slate, fontSize: 13 }}>
              Signing you in…
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  title: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.faint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.paper,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.paper,
    paddingHorizontal: 28,
  },
  errorBtnPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.red,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBtnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.ink,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.paper,
  },
  signingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
});
