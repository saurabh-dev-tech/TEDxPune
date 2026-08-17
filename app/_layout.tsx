import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/lib/auth/context';
import { ThemeProvider, useTheme } from '@/lib/theme/context';
import { ErrorBoundary } from '@/components/error-boundary';
import { ErrorToastContainer } from '@/components/error-toast';
import { ConsentModal } from '@/components/consent-modal';
import { hasUserConsented } from '@/lib/auth/consent';
import { registerForPushNotificationsAsync, registerPushToken } from '@/lib/notifications';
import { C } from '@/constants/theme';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

const PUBLIC_ROUTES = new Set(['index', '', 'login', 'oauth', 'email-auth', '+not-found']);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { initializing, isAuthenticated, user, claims, refreshUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTheme();

  const userId = user?.id || claims?.sub;
  const [checkingConsent, setCheckingConsent] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Register push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      registerPushToken()
        .catch((err) => {
          console.warn('[App] Push registration non-fatal error:', err);
        });
    }
  }, [isAuthenticated]);

  // Check first-time login consent status
  useEffect(() => {
    if (initializing) return;

    if (!isAuthenticated) {
      setCheckingConsent(false);
      setShowConsentModal(false);
      return;
    }

    (async () => {
      setCheckingConsent(true);
      try {
        // If user record from backend explicitly has consent === true, user has consented
        if (user?.consent === true) {
          setShowConsentModal(false);
        } else {
          const localConsented = await hasUserConsented(userId);
          setShowConsentModal(!localConsented);
        }
      } catch (err) {
        console.warn('[AuthGate] Consent check error:', err);
        setShowConsentModal(false);
      } finally {
        setCheckingConsent(false);
      }
    })();
  }, [initializing, isAuthenticated, userId, user?.consent]);

  useEffect(() => {
    if (initializing || checkingConsent) return;

    const firstSegment = segments[0] ?? '';
    const isPublic = PUBLIC_ROUTES.has(firstSegment);

    if (!isAuthenticated && !isPublic) {
      router.replace('/login');
    } else if (isAuthenticated && firstSegment === 'login' && !showConsentModal) {
      router.replace('/(tabs)');
    }
  }, [initializing, checkingConsent, isAuthenticated, segments, router, showConsentModal]);

  if (initializing || checkingConsent) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={C.red} size="large" />
      </View>
    );
  }

  return (
    <>
      {children}
      <ConsentModal
        visible={showConsentModal}
        userId={userId}
        onConsentAccepted={async () => {
          await refreshUser();
          setShowConsentModal(false);
          if (segments[0] === 'login') {
            router.replace('/(tabs)');
          }
        }}
      />
    </>
  );
}

function MainNavigation() {
  const { isDark } = useTheme();
  return (
    <>
      <AuthGate>
        <Stack initialRouteName="login">
          <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="login" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen
            name="compose"
            options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="notifications"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="talk/[id]"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="oauth"
            options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="email-auth"
            options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        </Stack>
      </AuthGate>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorToastContainer>
            <AuthProvider>
              <MainNavigation />
            </AuthProvider>
          </ErrorToastContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
