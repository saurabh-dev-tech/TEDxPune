import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { C, Fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth/context';
import {
  getApiBaseUrl,
  getApiOriginUrl,
  getGoogleAuthUrl,
  getLinkedInAuthUrl,
  setApiBaseUrlOverride,
} from '@/lib/api/config';
import { clearStoredApiUrl, saveApiUrl } from '@/lib/auth/storage';

function Wordmark() {
  const colorScheme = useColorScheme();
  const logo = colorScheme === 'dark'
    ? require('@/assets/images/logo-forlogin.png')
    : require('@/assets/images/logo-forlogin.png');

  return (
    <Image
      source={logo}
      style={{ width: 185, height: 160 }}
      resizeMode="contain"
    />
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithToken } = useAuth();
  const [loading, setLoading] = useState<null | 'linkedin' | 'google' | 'apple' | 'email' | 'token' | 'server'>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  // Server config — lets the dev point the phone at the Mac's LAN IP without
  // rebuilding. Stored in SecureStore so it survives app restarts.
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverInput, setServerInput] = useState(getApiBaseUrl());
  const [serverTest, setServerTest] = useState<null | { ok: boolean; message: string }>(null);
  const [currentServer, setCurrentServer] = useState(getApiBaseUrl());

  // The OAuth flow is handled in a dedicated WebView screen (app/oauth.tsx)
  // because the backend's callback returns JSON instead of redirecting to
  // our app scheme. We just push to that screen and let it sign us in.
  const handleLinkedIn = () => {
    if (loading) return;
    // Cast: typed-routes generator hasn't regenerated for /oauth yet at TS-check time.
    router.push('/oauth?provider=linkedin' as never);
  };

  const handleApple = () => {
    Alert.alert(
      'Apple Sign-in',
      'Apple sign-in is not yet supported by the backend. Please use LinkedIn for now.'
    );
  };
  const handleGoogle = () => {
    if (loading) return;
    router.push('/oauth?provider=google' as never);
  };

  const handleEmail = () => {
    if (loading) return;
    router.push('/email-auth' as never);
  };

  const handleDevToken = async () => {
    if (!tokenInput.trim()) return;
    setLoading('token');
    try {
      await signInWithToken(tokenInput.trim());
      setShowTokenModal(false);
      setTokenInput('');
    } catch (err: any) {
      Alert.alert('Token rejected', err?.message ?? 'The token was not accepted.');
    } finally {
      setLoading(null);
    }
  };

  const openServerSheet = () => {
    setServerInput(currentServer);
    setServerTest(null);
    setShowServerModal(true);
  };

  const normalizeServerUrl = (raw: string): string => {
    let v = raw.trim();
    if (!v) return v;
    if (!/^https?:\/\//i.test(v)) v = `http://${v}`;
    v = v.replace(/\/+$/, '');
    // Auto-append the documented base path if the user gave just the origin.
    if (!/\/api\/v\d+/.test(v)) v = `${v}/api/v1`;
    return v;
  };

  const testServer = async (url: string) => {
    setLoading('server');
    setServerTest(null);
    // Test both endpoints because they're at DIFFERENT paths on this backend:
    //  - OAuth lives at <origin>/auth/linkedin (no /api/v1)
    //  - Data lives at <origin>/api/v1/users (which 401s without a token = reachable)
    const origin = url.replace(/^(https?:\/\/[^/]+).*/, '$1');
    try {
      const authRes = await fetch(`${origin}/auth/linkedin`, { method: 'GET' });
      const dataRes = await fetch(`${url}/users/me`, { method: 'GET' }).catch(e => ({ status: 0, _err: e } as any));
      const lines: string[] = [];
      lines.push(`auth  → ${origin}/auth/linkedin  (HTTP ${authRes.status})`);
      lines.push(
        dataRes.status
          ? `data  → ${url}/users/me  (HTTP ${dataRes.status})`
          : `data  → ${url}/users/me  (unreachable)`
      );
      // 401 on /users/me is *good* — it means the route exists and is protected.
      const authOk = authRes.status >= 200 && authRes.status < 500;
      const dataOk = dataRes.status >= 200 && dataRes.status < 500;
      setServerTest({
        ok: authOk && dataOk,
        message: lines.join('\n'),
      });
    } catch (err: any) {
      setServerTest({
        ok: false,
        message: err?.message ?? 'Could not reach that URL.',
      });
    } finally {
      setLoading(null);
    }
  };

  const saveServer = async () => {
    const url = normalizeServerUrl(serverInput);
    if (!url) {
      Alert.alert('Invalid URL', 'Please enter a server URL.');
      return;
    }
    setLoading('server');
    try {
      await saveApiUrl(url);
      setApiBaseUrlOverride(url);
      setCurrentServer(url);
      setServerInput(url);
      setShowServerModal(false);
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Try again.');
    } finally {
      setLoading(null);
    }
  };

  const resetServer = async () => {
    setLoading('server');
    try {
      await clearStoredApiUrl();
      setApiBaseUrlOverride(null);
      const next = getApiBaseUrl();
      setCurrentServer(next);
      setServerInput(next);
      setServerTest(null);
    } finally {
      setLoading(null);
    }
  };

  const busy = loading !== null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Top rail */}
      <View style={styles.topRail}>
        <Wordmark />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ width: 16, height: 1, backgroundColor: C.red, marginRight: 8 }} />
          <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.red, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' }}>
            A community of curious minds
          </Text>
        </View>

        <Text style={styles.headline}>
          {'Connect\nwith ideas.\n'}
          <Text style={{ fontStyle: 'italic', color: C.red }}>Connect</Text>
          {'\nwith each other.'}
        </Text>

        <Text style={styles.subCopy}>
          A private networking space for speakers, attendees, and organizers of our Pune events.
        </Text>
      </View>

      {/* Auth buttons */}
      <View style={styles.authBlock}>
        <TouchableOpacity
          style={[styles.emailBtn, busy && { opacity: 0.6 }]}
          onPress={handleEmail}
          disabled={busy}
          activeOpacity={0.88}
        >
          <Text style={styles.emailBtnText}>Continue with your email</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          By continuing you agree to our{' '}
          <Text style={{ color: C.ink, textDecorationLine: 'underline', fontWeight: '500' }}>Code of Conduct</Text>.
          {'\n'}Access is invite-verified.
        </Text>
      </View>

      {/* Dev token modal */}
      <Modal
        visible={showTokenModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTokenModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.red, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Dev · sign in with JWT
            </Text>
            <Text style={{ fontFamily: Fonts.serif, fontSize: 20, lineHeight: 24, marginBottom: 14, color: C.ink }}>
              Paste an access token
            </Text>
            <TextInput
              style={styles.tokenInput}
              placeholder="eyJhbGciOi…"
              placeholderTextColor={C.faint}
              value={tokenInput}
              onChangeText={setTokenInput}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => { setShowTokenModal(false); setTokenInput(''); }}
                style={[styles.modalBtn, { borderWidth: 1, borderColor: C.hair }]}
              >
                <Text style={{ color: C.ink, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDevToken}
                disabled={!tokenInput.trim() || loading === 'token'}
                style={[styles.modalBtn, { backgroundColor: C.red, opacity: !tokenInput.trim() ? 0.5 : 1 }]}
              >
                {loading === 'token' ? (
                  <ActivityIndicator color={C.paper} />
                ) : (
                  <Text style={{ color: C.paper, fontWeight: '600', fontSize: 13 }}>Sign in</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Server config modal — dev affordance */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: 18 }]}>
            <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.red, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Dev · server URL
            </Text>
            <Text style={{ fontFamily: Fonts.serif, fontSize: 20, lineHeight: 24, marginBottom: 6, color: C.ink }}>
              Where is the backend?
            </Text>
            <Text style={{ fontSize: 12.5, color: C.muted, lineHeight: 18, marginBottom: 14 }}>
              Enter the full data base URL (include{' '}
              <Text style={{ fontFamily: Fonts.mono, color: C.ink }}>/api/v1</Text>). OAuth URLs are
              derived from the origin automatically. On a phone, replace{' '}
              <Text style={{ fontFamily: Fonts.mono, color: C.ink }}>localhost</Text> with your Mac's LAN IP —
              find it with <Text style={{ fontFamily: Fonts.mono, color: C.ink }}>ipconfig getifaddr en0</Text>.
            </Text>

            <TextInput
              style={[styles.tokenInput, { minHeight: 60, fontSize: 14 }]}
              placeholder="http://192.168.1.42:3000/api/v1"
              placeholderTextColor={C.faint}
              value={serverInput}
              onChangeText={(v) => { setServerInput(v); setServerTest(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              multiline
            />
            <View style={{ marginTop: 8, padding: 10, backgroundColor: C.mist, borderRadius: 8 }}>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 9, color: C.slate, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                resolves to
              </Text>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 11, color: C.ink, lineHeight: 16 }} numberOfLines={1}>
                data → {currentServer}/…
              </Text>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 11, color: C.ink, lineHeight: 16 }} numberOfLines={1}>
                oauth → {getLinkedInAuthUrl()}
              </Text>
            </View>

            {serverTest && (
              <View style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 8,
                backgroundColor: serverTest.ok ? '#ECFDF5' : C.redSoft,
                borderWidth: 1,
                borderColor: serverTest.ok ? '#A7F3D0' : `${C.red}30`,
              }}>
                <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: serverTest.ok ? '#065F46' : C.red, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                  {serverTest.ok ? '✓ ok' : '✕ failed'}
                </Text>
                <Text style={{ fontSize: 12, color: serverTest.ok ? '#065F46' : C.slate }}>
                  {serverTest.message}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => setShowServerModal(false)}
                disabled={loading === 'server'}
                style={[styles.modalBtn, { borderWidth: 1, borderColor: C.hair, flex: 0, paddingHorizontal: 14 }]}
              >
                <Text style={{ color: C.ink, fontWeight: '600', fontSize: 13 }}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={resetServer}
                disabled={loading === 'server'}
                style={[styles.modalBtn, { borderWidth: 1, borderColor: C.hair, flex: 0, paddingHorizontal: 14 }]}
              >
                <Text style={{ color: C.slate, fontWeight: '600', fontSize: 13 }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => testServer(normalizeServerUrl(serverInput))}
                disabled={!serverInput.trim() || loading === 'server'}
                style={[styles.modalBtn, { borderWidth: 1, borderColor: C.ink, opacity: !serverInput.trim() ? 0.5 : 1 }]}
              >
                {loading === 'server' ? (
                  <ActivityIndicator color={C.ink} />
                ) : (
                  <Text style={{ color: C.ink, fontWeight: '600', fontSize: 13 }}>Test</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveServer}
                disabled={!serverInput.trim() || loading === 'server'}
                style={[styles.modalBtn, { backgroundColor: C.red, opacity: !serverInput.trim() ? 0.5 : 1 }]}
              >
                <Text style={{ color: C.paper, fontWeight: '600', fontSize: 13 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  topRail: {
    paddingHorizontal: 28,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hero: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  headline: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: C.ink,
    marginBottom: 16,
  },
  subCopy: { fontSize: 14.5, lineHeight: 22, color: C.slate, maxWidth: 300 },
  authBlock: { paddingHorizontal: 28, paddingBottom: Platform.OS === 'ios' ? 8 : 28 },
  appleBtn: {
    height: 54,
    borderRadius: 12,
    backgroundColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  appleBtnText: { color: C.paper, fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  linkedInBtn: {
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: C.paper,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  linkedInBtnText: { color: C.ink, fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  googleBtn: {
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: C.paper,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  googleBtnText: { color: C.ink, fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 3,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.hair },
  devPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.hair,
  },
  emailBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  emailBtnText: { color: C.paper, fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  legal: { fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 17, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: C.paper,
    borderRadius: 16,
    padding: 22,
  },
  tokenInput: {
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontFamily: Fonts.mono,
    color: C.ink,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
