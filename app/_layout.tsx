import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/lib/auth/context';
import { C } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Watches auth state + current route segment.
 *
 * Routes considered "public" (accessible while signed out):
 *   - `login`  — the sign-in screen
 *   - `oauth`  — the WebView that performs the OAuth handshake
 *
 * - Signed out + on a protected route → push to /login
 * - Signed in  + on /login            → push to /(tabs)
 *   (note: /oauth is fine when signed in — it's mid-handshake)
 */
const PUBLIC_ROUTES = new Set(['login', 'oauth', 'email-auth']);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { initializing, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const firstSegment = segments[0] ?? '';
    const isPublic = PUBLIC_ROUTES.has(firstSegment);

    if (!isAuthenticated && !isPublic) {
      router.replace('/login');
    } else if (isAuthenticated && firstSegment === 'login') {
      router.replace('/(tabs)');
    }
  }, [initializing, isAuthenticated, segments, router]);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper }}>
        <ActivityIndicator color={C.red} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate>
          <Stack initialRouteName="login">
            <Stack.Screen name="login" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen
              name="compose"
              options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
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
          </Stack>
        </AuthGate>
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
