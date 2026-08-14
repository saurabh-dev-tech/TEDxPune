import AsyncStorage from '@react-native-async-storage/async-storage';
import { UsersApi } from '../api/users';

const CONSENT_STORAGE_PREFIX = '@tedxpune_user_consent_v1_';

export async function hasUserConsented(userId?: string): Promise<boolean> {
  const key = `${CONSENT_STORAGE_PREFIX}${userId || 'guest'}`;
  try {
    const value = await AsyncStorage.getItem(key);
    return value === 'true';
  } catch (err) {
    console.warn('[Consent] Error reading consent status:', err);
    return false;
  }
}

export async function saveUserConsent(userId?: string): Promise<void> {
  const key = `${CONSENT_STORAGE_PREFIX}${userId || 'guest'}`;
  try {
    await AsyncStorage.setItem(key, 'true');
  } catch (err) {
    console.warn('[Consent] Error saving local consent status:', err);
  }

  if (userId) {
    try {
      await UsersApi.updateMe({ consent: true });
    } catch (err) {
      console.warn('[Consent] Non-fatal backend update error:', err);
    }
  }
}
