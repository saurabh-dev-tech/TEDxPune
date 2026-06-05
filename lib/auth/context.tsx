import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ApiError, setUnauthorizedHandler } from '../api/client';
import { setApiBaseUrlOverride } from '../api/config';
import { UsersApi } from '../api/users';
import type { User } from '../api/types';
import {
  clearToken,
  getStoredApiUrl,
  getStoredSupabaseConfig,
  getToken,
  saveToken,
} from './storage';
import { signInWithGoogle, signInWithLinkedIn } from './oauth';
import { decodeJwt, type JwtClaims } from './jwt';
import { setSupabaseConfigOverride, supabaseSignOut } from './supabase';

/**
 * Only 401/403 from auth-protected endpoints mean "your token is bad". 404 /
 * 5xx / network errors mean the backend has a problem, but the JWT is still
 * valid — keep the user signed in and let them retry.
 */
function isAuthFailure(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status === 401 || err.status === 403;
  }
  return false;
}

function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

interface AuthState {
  initializing: boolean;
  token: string | null;
  /** Decoded JWT payload — populated as soon as a token is saved. Useful as
   *  a name/picture fallback when /users/me isn't available. */
  claims: JwtClaims | null;
  /** Best-effort full profile from the backend. May be null if /users/me
   *  AND /users/:id both fail. */
  user: User | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signInWithLinkedIn: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Best-effort profile fetch:
 *   1. Try /users/me (canonical).
 *   2. If that 404s and we have a JWT subject, try /users/:sub.
 *   3. Any 401/403 → re-throws so the caller can sign out.
 */
async function fetchProfile(claims: JwtClaims | null): Promise<User | null> {
  try {
    return await UsersApi.me();
  } catch (err) {
    if (isAuthFailure(err)) throw err;
    if (!isNotFound(err)) {
      // 5xx / network — log and give up for now.
      console.warn('[auth] /users/me failed:', (err as Error)?.message);
      return null;
    }
    // /users/me is 404 — try the documented /users/:id endpoint instead.
    const id = claims?.sub;
    if (!id) return null;
    try {
      return await UsersApi.byId(id);
    } catch (err2) {
      if (isAuthFailure(err2)) throw err2;
      console.warn(
        `[auth] /users/${id} also failed:`,
        (err2 as Error)?.message
      );
      return null;
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [claims, setClaims] = useState<JwtClaims | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const mounted = useRef(true);

  // Boot
  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        // Load persisted API base URL FIRST — every subsequent request relies
        // on this being correct (e.g. a phone needs the Mac's LAN IP, not "localhost").
        const storedUrl = await getStoredApiUrl();
        if (storedUrl) setApiBaseUrlOverride(storedUrl);

        // Same idea for Supabase — runtime override (set via the in-app sheet)
        // beats env vars, so apply it before any Supabase call can fire.
        const storedSb = await getStoredSupabaseConfig();
        if (storedSb) setSupabaseConfigOverride(storedSb.url, storedSb.anonKey);

        const stored = await getToken();
        if (!mounted.current) return;
        if (stored) {
          const decoded = decodeJwt(stored);
          setToken(stored);
          setClaims(decoded);
          try {
            const profile = await fetchProfile(decoded);
            if (mounted.current && profile) setUser(profile);
          } catch (err) {
            if (isAuthFailure(err)) {
              await clearToken();
              if (mounted.current) {
                setToken(null);
                setClaims(null);
              }
            }
          }
        }
      } finally {
        if (mounted.current) setInitializing(false);
      }
    })();

    return () => {
      mounted.current = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    // Clear local state first so the UI feels instant; remote work is best-effort.
    setToken(null);
    setClaims(null);
    setUser(null);
    await clearToken();
    // Also drop any cached Supabase session (no-op if Supabase isn't configured).
    await supabaseSignOut();
  }, []);

  // 401 from the API → log out
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setClaims(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const signInWithToken = useCallback(async (newToken: string) => {
    await saveToken(newToken);
    const decoded = decodeJwt(newToken);
    setToken(newToken);
    setClaims(decoded);
    try {
      const profile = await fetchProfile(decoded);
      if (profile) setUser(profile);
    } catch (err) {
      if (isAuthFailure(err)) {
        await clearToken();
        setToken(null);
        setClaims(null);
        throw err;
      }
      // Non-auth error — sign-in still succeeded.
    }
  }, []);

  const handleLinkedIn = useCallback(async () => {
    const { token: newToken } = await signInWithLinkedIn();
    await signInWithToken(newToken);
  }, [signInWithToken]);

  const handleGoogle = useCallback(async () => {
    const { token: newToken } = await signInWithGoogle();
    await signInWithToken(newToken);
  }, [signInWithToken]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const profile = await fetchProfile(claims);
    if (profile) setUser(profile);
  }, [token, claims]);

  const value = useMemo<AuthContextValue>(
    () => ({
      initializing,
      token,
      claims,
      user,
      isAuthenticated: !!token,
      signInWithLinkedIn: handleLinkedIn,
      signInWithGoogle: handleGoogle,
      signInWithToken,
      signOut,
      refreshUser,
      setUser,
    }),
    [
      initializing,
      token,
      claims,
      user,
      handleLinkedIn,
      handleGoogle,
      signInWithToken,
      signOut,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
