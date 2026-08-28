import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { UsersApi } from '../api/users';

// Configure foreground notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({  
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for Expo Push Notifications on physical devices,
 * acquire permissions, and send push token to backend (/users/push-token).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Push notifications require a physical device.');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Push] Permission not granted for push notifications!');
      return null;
    }

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const pushToken = tokenData.data;

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E62B1E',
      });
    }

    // Save token to backend (/api/v1/users/push-token)
    try {
      await UsersApi.registerPushToken(pushToken, Device.osName || Platform.OS);
      console.log('[Push] Push token registered with backend successfully.');
    } catch (err: any) {
      console.warn('[Push] Failed to register push token with backend:', err?.message || err);
    }

    return pushToken;
  } catch (err) {
    console.warn('[Push] Error registering push notifications:', err);
    return null;
  }
}

/**
 * Custom React hook to observe notification clicks and route user
 * directly to target post screen (/post/[id]).
 */
export function useNotificationObserver() {
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const postId = data?.postId ?? data?.post_id ?? data?.id;

      if (postId) {
        router.push(`/post/${postId}` as any);
      } else if (data?.url) {
        router.push(data.url as any);
      }
    });

    return () => subscription.remove();
  }, [router]);
}
