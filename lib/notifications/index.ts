import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Safely configure notification handler without crashing if unsupported on web/simulator
try {
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (err) {
  console.warn('[PushNotifications] Could not set notification handler:', err);
}

export interface PushNotificationResult {
  token: string | null;
  status: 'granted' | 'denied' | 'undetermined';
  error?: string;
}

/**
 * Safely obtain Expo push token or native device token without throwing if Firebase is not initialized.
 */
async function getExpoPushTokenSafely(): Promise<string | null> {
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData?.data ?? null;
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('Firebase') || msg.includes('FCM') || msg.includes('Default FirebaseApp')) {
      console.log('[PushNotifications] Firebase/FCM is not configured for Android push notifications; skipping token generation.');
      return null;
    }
    try {
      const deviceTokenData = await Notifications.getDevicePushTokenAsync();
      return (deviceTokenData?.data as string) ?? null;
    } catch {
      console.log('[PushNotifications] Push token unavailable:', msg);
      return null;
    }
  }
}

/**
 * Register push token with backend API.
 */
export async function registerPushToken(apiClient?: any) {
  try {
    if (Platform.OS === 'web') return;
    if (Device?.isDevice === false) {
      console.log('[PushNotifications] Device is simulator/emulator; skipping push token generation.');
      return;
    }

    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default TEDxNotifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E11D2E',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted' && Notifications.requestPermissionsAsync) {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted for push notifications.');
      return;
    }

    const pushToken = await getExpoPushTokenSafely();
    if (pushToken) {
      const client = apiClient ?? require('@/lib/api/client').api;
      await client.post('/users/push-token', {
        pushToken,
        platform: Platform.OS,
      });
      console.log('[PushNotifications] Registered push token with backend:', pushToken);
    }
  } catch (err: any) {
    console.log('[PushNotifications] Push token registration skipped:', err?.message || err);
  }
}

/**
 * Register device for push notifications and retrieve Expo Push Token.
 */
export async function registerForPushNotificationsAsync(apiClient?: any): Promise<PushNotificationResult> {
  try {
    if (Platform.OS === 'web') {
      return { token: null, status: 'undetermined' };
    }

    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default TEDxNotifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E11D2E',
      });
    }

    const settings: any = await Notifications.getPermissionsAsync();
    let isGranted = settings?.granted || settings?.status === 'granted';
    let finalStatus: 'granted' | 'denied' | 'undetermined' = isGranted ? 'granted' : 'denied';

    if (!isGranted && Notifications.requestPermissionsAsync) {
      const requestRes: any = await Notifications.requestPermissionsAsync();
      isGranted = requestRes?.granted || requestRes?.status === 'granted';
      finalStatus = isGranted ? 'granted' : 'denied';
    }

    if (!isGranted) {
      return {
        token: null,
        status: finalStatus,
        error: 'Push notification permission was not granted.',
      };
    }

    const pushToken = await getExpoPushTokenSafely();
    if (pushToken) {
      try {
        const client = apiClient ?? require('@/lib/api/client').api;
        await client.post('/users/push-token', {
          pushToken,
          platform: Platform.OS,
        });
      } catch (postErr) {
        console.warn('[PushNotifications] Could not post push token to backend:', postErr);
      }
    }

    return {
      token: pushToken,
      status: 'granted',
    };
  } catch (err: any) {
    console.warn('[PushNotifications] Failed to get push token:', err?.message || err);
    return {
      token: null,
      status: 'denied',
      error: err?.message || 'Failed to generate push token',
    };
  }
}

/**
 * Hook subscriber for notification received in foreground.
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  if (!Notifications.addNotificationReceivedListener) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Hook subscriber for notification tapped/interacted with by user.
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  if (!Notifications.addNotificationResponseReceivedListener) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
}
