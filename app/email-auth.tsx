import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { C, Fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth/context';
import { ExchangeApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import {
  getSupabase,
  isSupabaseConfigured,
  setSupabaseConfigOverride,
  subscribeSupabaseConfigured,
} from '@/lib/auth/supabase';
import {
  clearStoredSupabaseConfig,
  saveSupabaseConfig,
} from '@/lib/auth/storage';

// Supabase email OTP length. Default is 6. Change this constant
// AND the copy strings ("…-digit code") together if you change it server-side.
const CODE_LEN = 6;

/**
 * Thrown when Supabase verified the user but the backend has neither an
 * `/auth/exchange` endpoint nor a way to accept Supabase-issued JWTs. The
 * user is technically authenticated (we have their email) but no protected
 * backend route will work until the exchange endpoint is built.
 */
class BackendExchangeMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendExchangeMissingError';
  }
}
const RESEND_COOLDOWN_S = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

type Step = 'email' | 'code';

export default function EmailAuthScreen() {
  const router = useRouter();
  const { signInWithToken } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  // Supabase config — tracked as state so the UI re-renders when the user
  // saves credentials via the in-app config sheet.
  const [supaConfigured, setSupaConfigured] = useState(isSupabaseConfigured());
  const [showConfig, setShowConfig] = useState(false);
  useEffect(() => subscribeSupabaseConfigured(setSupaConfigured), []);

  // Countdown for resend
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const emailValid = EMAIL_RE.test(email.trim());

  const checkEmailInDb = async (rawEmail: string): Promise<boolean> => {
    const cleanEmail = rawEmail.trim().toLowerCase();
    const supabase = getSupabase();

    try {
      // 1. Check whitelisted_users table with "Attendee Email" column
      const { data: wData1, error: wErr1 } = await supabase
        .from('whitelisted_users')
        .select('*')
        .ilike('Attendee Email', cleanEmail)
        .limit(1);

      if (!wErr1 && wData1 && wData1.length > 0) {
        return true;
      }

      // 1b. Fuzzy match (in case of leading/trailing spaces in DB records)
      const { data: wData1b, error: wErr1b } = await supabase
        .from('whitelisted_users')
        .select('*')
        .ilike('Attendee Email', `%${cleanEmail}%`)
        .limit(1);

      if (!wErr1b && wData1b && wData1b.length > 0) {
        return true;
      }

      // 2. Check whitelisted_users table with "email" column (fallback)
      const { data: wData2, error: wErr2 } = await supabase
        .from('whitelisted_users')
        .select('*')
        .ilike('email', cleanEmail)
        .limit(1);

      if (!wErr2 && wData2 && wData2.length > 0) {
        return true;
      }

      // 3. Check users table with "email" column
      const { data: uData, error: uErr } = await supabase
        .from('users')
        .select('id, email')
        .ilike('email', cleanEmail)
        .limit(1);

      if (!uErr && uData && uData.length > 0) {
        return true;
      }

      // If RLS restricted public anon access, allow proceeding so server (service role) validates
      if (wErr1 || wErr1b || wErr2 || uErr) {
        console.warn('[email-auth] Whitelist DB query warning, deferring to server auth:', { wErr1, wErr1b, wErr2, uErr });
        return true;
      }
    } catch (err) {
      console.warn('[email-auth] DB whitelist check exception:', err);
      return true;
    }

    return false;
  };

  const requestCode = async (isResend = false) => {
    if (!emailValid || requesting) return;
    if (email.trim().toLowerCase() === 'playstore@tedxpune.com') {
      if (!isResend) setStep('code');
      return;
    }
    if (!supaConfigured) {
      setShowConfig(true);
      return;
    }
    setRequesting(true);
    setError(null);
    try {
      const allowed = await checkEmailInDb(email);
      if (!allowed) {
        setError('You are not part of the tribe. Only ticket holders and whitelisted members can log in.');
        return;
      }

      const { error: sbError } = await getSupabase().auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Allow new users — flip to false if your Supabase project should
          // only accept pre-existing accounts.
          shouldCreateUser: true,
        },
      });
      if (sbError) throw sbError;
      setResendIn(RESEND_COOLDOWN_S);
      if (!isResend) setStep('code');
    } catch (err: any) {
      handleSupabaseError(err, 'request');
    } finally {
      setRequesting(false);
    }
  };

  const verifyCode = async (codeToTry?: string) => {
    const c = (codeToTry ?? code).trim();
    if (c.length !== CODE_LEN || verifying) return;
    setVerifying(true);
    setError(null);

    // Playstore review guest bypass
    if (email.trim().toLowerCase() === 'playstore@tedxpune.com') {
      if (c !== '123456') {
        setError('That code is incorrect.');
        setVerifying(false);
        return;
      }
      try {
        const res = await ExchangeApi.fromSupabase('playstore-bypass-token');
        if (res?.accessToken) {
          await signInWithToken(res.accessToken);
          router.replace('/(tabs)');
        } else {
          setError('Failed to log in: no access token returned.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to exchange playstore bypass token.');
      } finally {
        setVerifying(false);
      }
      return;
    }

    if (!supaConfigured) {
      setShowConfig(true);
      setVerifying(false);
      return;
    }
    try {
      // 1. Verify the OTP with Supabase → Supabase session
      const { data, error: sbError } = await getSupabase().auth.verifyOtp({
        email: email.trim(),
        token: c,
        type: 'email',
      });
      if (sbError) throw sbError;
      const supabaseToken = data?.session?.access_token;
      if (!supabaseToken) {
        setError('Supabase verified the code but did not return a session.');
        return;
      }

      // 2. Try to exchange the Supabase token for a backend JWT so /users/me etc. work.
      //    Best-effort: any failure → fall back to the Supabase token.
      let backendToken: string = supabaseToken;
      let usedSupabaseFallback = true;
      try {
        const res = await ExchangeApi.fromSupabase(supabaseToken);
        if (res?.accessToken) {
          backendToken = res.accessToken;
          usedSupabaseFallback = false;
        }
      } catch (err) {
        // 401/403 means the backend's /auth/exchange explicitly rejected this
        // user (e.g. invite-only, blocked) — bubble up.
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          throw err;
        }
        console.warn(
          '[email-auth] /auth/exchange unavailable, using Supabase token directly:',
          (err as Error)?.message
        );
      }

      // 3. Hand off to the existing auth pipeline.
      try {
        await signInWithToken(backendToken);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          // 401 here while using the Supabase fallback is EXPECTED — the
          // backend's JWT guard correctly rejects a token it didn't sign.
          // It is NOT "your account isn't allowed".
          if (usedSupabaseFallback) {
            throw new BackendExchangeMissingError(
              'Supabase verified your email, but the backend does not have ' +
              '/auth/exchange yet. Until that endpoint is deployed, the data ' +
              'screens will not load.\n\n' +
              'For now, use "Paste a full JWT here to skip OTP" below with a ' +
              'real backend JWT (get one from your Swagger UI at /docs).'
            );
          }
          throw err;
        }
        // Network / 5xx — token is saved, profile fetch can retry later.
        console.warn(
          '[email-auth] post-signin profile fetch failed (continuing anyway):',
          (err as Error)?.message
        );
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      handleSupabaseError(err, 'verify');
    } finally {
      setVerifying(false);
    }
  };

  /**
   * Map Supabase + backend errors to UI-friendly messages.
   *
   * Supabase errors come through as plain `Error`s with `.message` and
   * sometimes `.status`. Backend errors (from /auth/exchange) come through
   * as `ApiError` with a typed status.
   */
  const handleSupabaseError = (err: any, phase: 'request' | 'verify') => {
    // Specific, accurate message when the backend just doesn't have
    // /auth/exchange yet. (Distinct from "your account isn't allowed",
    // which would be a real authorization decision.)
    if (err instanceof BackendExchangeMissingError) {
      setError(err.message);
      return;
    }

    // Backend-side exchange error
    if (err instanceof ApiError) {
      if (err.status === 403 || err.message?.toLowerCase().includes('not part of the tribe')) {
        setError('You are not part of the tribe. Only ticket holders and whitelisted members can log in.');
        return;
      }
      if (err.status === 401) {
        setError('Your account isn\'t allowed in this community. Contact an organizer.');
        return;
      }
      setError(err.message || 'Backend rejected the sign-in. Try again.');
      return;
    }

    // Supabase-side errors — match by message / status fragments
    const msg = String(err?.message ?? '').toLowerCase();
    const status = Number(err?.status ?? err?.statusCode ?? 0);

    if (status === 429 || msg.includes('rate limit')) {
      setError('Too many attempts. Please wait a minute and try again.');
      return;
    }
    if (msg.includes('invalid') && msg.includes('email')) {
      setError('That email looks invalid. Double-check the address.');
      return;
    }
    if (msg.includes('expired') || msg.includes('invalid') || msg.includes('token') || msg.includes('otp')) {
      setError(phase === 'verify' ? 'That code is incorrect or expired.' : 'Could not send the code. Try again.');
      return;
    }
    if (msg.includes('signups') && msg.includes('disabled')) {
      setError('New sign-ups are disabled for this email. Ask an organizer to invite you.');
      return;
    }
    if (msg.includes('user not found')) {
      setError('No account with that email. Ask an organizer to invite you.');
      return;
    }
    // "Database error saving new user" → almost always one of three
    // configuration issues in the user's Supabase project. Spell them out
    // instead of relaying Supabase's generic message.
    if (msg.includes('database error') && msg.includes('saving')) {
      setError(
        'Supabase couldn\'t create the user. This is almost always one of:\n\n' +
        '1. Auth → Providers → Email → "Allow new users to sign up" is OFF. Turn it on.\n\n' +
        '2. A handle_new_user trigger on auth.users is failing (often because public.profiles RLS blocks the insert). In SQL Editor run:\n' +
        '   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;\n\n' +
        '3. "Confirm email" is ON but no SMTP is configured. Either turn it off for now, or set up SMTP.\n\n' +
        'Fix one, retry.'
      );
      return;
    }
    setError(err?.message || 'Network error. Try again.');
  };

  /**
   * Dev escape hatch: if the user's already holding a real JWT (e.g. from
   * Swagger or a manual cURL), they can paste it as the "code" to skip OTP.
   * Hidden behind __DEV__ to avoid suggesting it in production.
   */
  const tryDevJwt = async () => {
    const trimmed = code.trim();
    if (!JWT_RE.test(trimmed)) {
      Alert.alert('Not a JWT', 'Paste a token that looks like `xxxxx.yyyyy.zzzzz`.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      await signInWithToken(trimmed);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.message ?? 'Token rejected.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} disabled={requesting || verifying}>
            <Text style={{ fontSize: 14, color: requesting || verifying ? C.faint : C.slate }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>
            {step === 'email' ? 'Sign in with email' : 'Verify code'}
          </Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 28 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'email' ? (
            <EmailStep
              email={email}
              setEmail={setEmail}
              emailValid={emailValid}
              requesting={requesting}
              error={error}
              onSubmit={() => requestCode(false)}
              supaConfigured={supaConfigured}
              onOpenConfig={() => setShowConfig(true)}
            />
          ) : (
            <CodeStep
              email={email}
              code={code}
              setCode={setCode}
              verifying={verifying}
              resendIn={resendIn}
              requesting={requesting}
              error={error}
              onSubmit={() => verifyCode()}
              onResend={() => requestCode(true)}
              onEditEmail={() => { setStep('email'); setCode(''); setError(null); }}
              tryDevJwt={tryDevJwt}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <SupabaseConfigSheet
        visible={showConfig}
        onClose={() => setShowConfig(false)}
      />
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────────────────
 * Supabase config sheet
 * ───────────────────────────────────────────────────────── */
function SupabaseConfigSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string }>(null);

  const urlValid = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in|net)$/i.test(url.trim());
  const keyValid = key.trim().length > 40 && key.trim().split('.').length === 3;

  const handleTest = async () => {
    if (!urlValid || !keyValid) return;
    setSaving(true);
    setTestResult(null);
    try {
      // Hit the public /auth/v1/health endpoint — 200 = url + key both valid.
      const res = await fetch(`${url.trim()}/auth/v1/health`, {
        headers: { apikey: key.trim() },
      });
      setTestResult({
        ok: res.ok,
        message: res.ok
          ? `Reached Supabase (HTTP ${res.status})`
          : `Server responded ${res.status} — check your anon key.`,
      });
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message ?? 'Network error.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!urlValid || !keyValid) return;
    setSaving(true);
    try {
      const cleanUrl = url.trim().replace(/\/+$/, '');
      const cleanKey = key.trim();
      await saveSupabaseConfig({ url: cleanUrl, anonKey: cleanKey });
      setSupabaseConfigOverride(cleanUrl, cleanKey);
      setUrl('');
      setKey('');
      setTestResult(null);
      onClose();
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await clearStoredSupabaseConfig();
      setSupabaseConfigOverride(null, null);
      setUrl('');
      setKey('');
      setTestResult(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.configOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={{ maxHeight: '92%' }}
            contentContainerStyle={styles.configCard}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.red, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Connect Supabase
            </Text>
            <Text style={{ fontFamily: Fonts.serif, fontSize: 24, lineHeight: 28, color: C.ink, marginBottom: 14 }}>
              Two values from your{'\n'}Supabase project.
            </Text>

            <View style={styles.stepsBox}>
              <Text style={styles.stepLine}>
                <Text style={{ color: C.red, fontWeight: '700' }}>1.</Text>{' '}
                Open your project at{' '}
                <Text
                  style={{ color: C.ink, textDecorationLine: 'underline' }}
                  onPress={() => Linking.openURL('https://supabase.com/dashboard')}
                >
                  supabase.com/dashboard
                </Text>
                .
              </Text>
              <Text style={styles.stepLine}>
                <Text style={{ color: C.red, fontWeight: '700' }}>2.</Text>{' '}
                Settings → API. Copy the <Text style={styles.kbd}>Project URL</Text> and the{' '}
                <Text style={styles.kbd}>anon public</Text> key.
              </Text>
              <Text style={styles.stepLine}>
                <Text style={{ color: C.red, fontWeight: '700' }}>3.</Text>{' '}
                Auth → Email Templates → Magic Link. Replace{' '}
                <Text style={styles.kbd}>{`{{ .ConfirmationURL }}`}</Text> with{' '}
                <Text style={styles.kbd}>{`{{ .Token }}`}</Text> so users get a numeric code.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Project URL</Text>
            <TextInput
              style={styles.field}
              value={url}
              onChangeText={(v) => { setUrl(v); setTestResult(null); }}
              placeholder="https://abcdefgh.supabase.co"
              placeholderTextColor={C.faint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!saving}
            />

            <Text style={styles.fieldLabel}>anon public key</Text>
            <TextInput
              style={[styles.field, { minHeight: 70, fontFamily: Fonts.mono, fontSize: 12 }]}
              value={key}
              onChangeText={(v) => { setKey(v); setTestResult(null); }}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              placeholderTextColor={C.faint}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              editable={!saving}
            />

            {testResult && (
              <View style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 8,
                backgroundColor: testResult.ok ? '#ECFDF5' : C.redSoft,
                borderWidth: 1,
                borderColor: testResult.ok ? '#A7F3D0' : `${C.red}30`,
              }}>
                <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: testResult.ok ? '#065F46' : C.red, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                  {testResult.ok ? '✓ OK' : '✕ Failed'}
                </Text>
                <Text style={{ fontSize: 12, color: testResult.ok ? '#065F46' : C.slate }}>
                  {testResult.message}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <TouchableOpacity
                onPress={onClose}
                disabled={saving}
                style={[styles.configBtn, { borderWidth: 1, borderColor: C.hair, flex: 0, paddingHorizontal: 14 }]}
              >
                <Text style={{ color: C.ink, fontWeight: '600', fontSize: 13 }}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReset}
                disabled={saving}
                style={[styles.configBtn, { borderWidth: 1, borderColor: C.hair, flex: 0, paddingHorizontal: 14 }]}
              >
                <Text style={{ color: C.slate, fontWeight: '600', fontSize: 13 }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleTest}
                disabled={!urlValid || !keyValid || saving}
                style={[styles.configBtn, { borderWidth: 1, borderColor: C.ink, opacity: (!urlValid || !keyValid) ? 0.5 : 1 }]}
              >
                {saving ? (
                  <ActivityIndicator color={C.ink} />
                ) : (
                  <Text style={{ color: C.ink, fontWeight: '600', fontSize: 13 }}>Test</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!urlValid || !keyValid || saving}
                style={[styles.configBtn, { backgroundColor: C.red, opacity: (!urlValid || !keyValid) ? 0.5 : 1 }]}
              >
                <Text style={{ color: C.paper, fontWeight: '600', fontSize: 13 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────
 * Step 1 — collect email
 * ───────────────────────────────────────────────────────── */
function EmailStep({
  email,
  setEmail,
  emailValid,
  requesting,
  error,
  onSubmit,
  supaConfigured,
  onOpenConfig,
}: {
  email: string;
  setEmail: (v: string) => void;
  emailValid: boolean;
  requesting: boolean;
  error: string | null;
  onSubmit: () => void;
  supaConfigured: boolean;
  onOpenConfig: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
        <View style={{ width: 16, height: 1, backgroundColor: C.red, marginRight: 8 }} />
        <Text style={{ fontFamily: Fonts.mono, fontSize: 11, color: C.red, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Step 1 of 2
        </Text>
      </View>

      <Text style={styles.headline}>
        Sign in with a{'\n'}
        <Text style={{ fontStyle: 'italic', color: C.red }}>one-time</Text> code.
      </Text>
      <Text style={styles.subCopy}>
        Enter your email and we'll send you a 6-digit code to verify it's you.
      </Text>

      <Text style={styles.fieldLabel}>Email</Text>
      <TextInput
        style={styles.field}
        value={email}
        onChangeText={setEmail}
        placeholder="you@company.com"
        placeholderTextColor={C.faint}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="send"
        onSubmitEditing={() => emailValid && !requesting && onSubmit()}
        editable={!requesting}
      />

      {!supaConfigured && (
        <View style={styles.configBanner}>
          <Text style={{ fontFamily: Fonts.mono, fontSize: 9.5, color: C.red, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
            One-time setup
          </Text>
          <Text style={{ fontSize: 13, color: C.slate, lineHeight: 19, marginBottom: 12 }}>
            Email sign-in is powered by Supabase. Add your project URL + anon key
            (takes ~2 minutes) to enable it.
          </Text>
          <TouchableOpacity style={styles.configBannerBtn} onPress={onOpenConfig}>
            <Text style={{ color: C.paper, fontWeight: '600', fontSize: 13 }}>
              Configure Supabase
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!!error && <ErrorBox message={error} />}

      <TouchableOpacity
        style={[styles.primaryBtn, (!emailValid || requesting) && { opacity: 0.5 }]}
        onPress={onSubmit}
        disabled={!emailValid || requesting}
        activeOpacity={0.88}
      >
        {requesting ? <ActivityIndicator color={C.paper} /> : <Text style={styles.primaryBtnText}>Send code</Text>}
      </TouchableOpacity>

      <Text style={styles.legal}>
        Access is invite-verified. By continuing you agree to our{' '}
        <Text style={{ color: C.ink, textDecorationLine: 'underline' }}>Code of Conduct</Text>.
      </Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────
 * Step 2 — enter the code
 * ───────────────────────────────────────────────────────── */
function CodeStep({
  email,
  code,
  setCode,
  verifying,
  resendIn,
  requesting,
  error,
  onSubmit,
  onResend,
  onEditEmail,
  tryDevJwt,
}: {
  email: string;
  code: string;
  setCode: (v: string) => void;
  verifying: boolean;
  resendIn: number;
  requesting: boolean;
  error: string | null;
  onSubmit: () => void;
  onResend: () => void;
  onEditEmail: () => void;
  tryDevJwt: () => void;
}) {
  const hiddenRef = useRef<TextInput | null>(null);
  const digits = useMemo(() => {
    const arr = Array(CODE_LEN).fill('');
    for (let i = 0; i < Math.min(code.length, CODE_LEN); i++) arr[i] = code[i];
    return arr;
  }, [code]);

  // Auto-submit when all digits entered.
  useEffect(() => {
    if (code.length === CODE_LEN && !verifying) onSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Detect if user pasted a JWT into the code box (3 dot-separated segments)
  const looksLikeJwt = code.includes('.') && code.split('.').length === 3;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
        <View style={{ width: 16, height: 1, backgroundColor: C.red, marginRight: 8 }} />
        <Text style={{ fontFamily: Fonts.mono, fontSize: 11, color: C.red, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Step 2 of 2
        </Text>
      </View>

      <Text style={styles.headline}>
        Check your inbox.
      </Text>
      <Text style={styles.subCopy}>
        We sent a 6-digit code to{' '}
        <Text style={{ color: C.ink, fontWeight: '600' }}>{email}</Text>.
        <Text onPress={onEditEmail} style={{ color: C.red }}>  Change</Text>
      </Text>

      {/* Visible boxes display, hidden TextInput captures keystrokes */}
      <TouchableOpacity activeOpacity={1} onPress={() => hiddenRef.current?.focus()}>
        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <View
              key={i}
              style={[
                styles.otpBox,
                i === code.length && !verifying && styles.otpBoxActive,
                !!d && styles.otpBoxFilled,
              ]}
            >
              <Text style={styles.otpDigit}>{d}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      <TextInput
        ref={hiddenRef}
        style={styles.hiddenInput}
        value={code}
        onChangeText={(v) => {
          // Allow JWT paste (dots + dashes + underscores) in dev; otherwise digits only.
          if (__DEV__ && v.includes('.')) {
            setCode(v.replace(/\s/g, ''));
          } else {
            setCode(v.replace(/[^0-9]/g, '').slice(0, CODE_LEN));
          }
        }}
        keyboardType={__DEV__ ? 'default' : 'number-pad'}
        autoFocus
        editable={!verifying}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={__DEV__ ? 2048 : CODE_LEN}
      />

      {!!error && <ErrorBox message={error} />}

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          (code.length < CODE_LEN || verifying) && !looksLikeJwt && { opacity: 0.5 },
        ]}
        onPress={looksLikeJwt && __DEV__ ? tryDevJwt : onSubmit}
        disabled={(code.length < CODE_LEN && !looksLikeJwt) || verifying}
        activeOpacity={0.88}
      >
        {verifying ? (
          <ActivityIndicator color={C.paper} />
        ) : (
          <Text style={styles.primaryBtnText}>
            {looksLikeJwt && __DEV__ ? 'Sign in with this JWT' : 'Verify & sign in'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendRow}>
        <Text style={{ fontSize: 13, color: C.slate }}>Didn't get it?</Text>
        {resendIn > 0 ? (
          <Text style={{ fontFamily: Fonts.mono, fontSize: 12, color: C.faint }}>
            resend in {resendIn}s
          </Text>
        ) : (
          <TouchableOpacity onPress={onResend} disabled={requesting}>
            <Text style={{ fontSize: 13, color: C.red, fontWeight: '600' }}>
              {requesting ? 'Sending…' : 'Resend code'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {__DEV__ && (
        <Text style={styles.devHint}>
          dev · paste a full JWT here to skip OTP
        </Text>
      )}
    </View>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Text style={{ fontFamily: Fonts.mono, fontSize: 9.5, color: C.red, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
        Error
      </Text>
      <Text style={{ fontSize: 13, color: C.slate, lineHeight: 19 }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  topBarTitle: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.faint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: Fonts.serif,
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1,
    color: C.ink,
    marginBottom: 14,
  },
  subCopy: {
    fontSize: 14.5,
    lineHeight: 22,
    color: C.slate,
    marginBottom: 28,
  },
  fieldLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.slate,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  field: {
    height: 52,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: C.ink,
    marginBottom: 16,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 12,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: C.paper,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  legal: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 18,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.78,
    marginHorizontal: 2.5,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.paper,
  },
  otpBoxActive: {
    borderColor: C.ink,
    borderWidth: 2,
  },
  otpBoxFilled: {
    borderColor: C.ink,
    backgroundColor: C.mist,
  },
  otpDigit: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    color: C.ink,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorBox: {
    backgroundColor: C.redSoft,
    borderWidth: 1,
    borderColor: `${C.red}30`,
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  devHint: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.faint,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 20,
  },

  // ─── Supabase-not-configured banner (on the email step) ───
  configBanner: {
    marginVertical: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.redSoft,
    borderWidth: 1,
    borderColor: `${C.red}30`,
  },
  configBannerBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.ink,
  },

  // ─── Supabase config modal ───
  configOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  configCard: {
    backgroundColor: C.paper,
    borderRadius: 16,
    padding: 22,
  },
  stepsBox: {
    backgroundColor: C.mist,
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
    gap: 8,
  },
  stepLine: {
    fontSize: 12.5,
    lineHeight: 18,
    color: C.slate,
  },
  kbd: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: C.ink,
    backgroundColor: C.paper,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  configBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
