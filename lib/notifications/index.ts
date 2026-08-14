import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
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
 * Register device for push notifications and retrieve Expo Push Token.
 */
export async function registerForPushNotificationsAsync(): Promise<PushNotificationResult> {
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

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    return {
      token: tokenData.data,
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
