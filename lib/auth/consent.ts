import AsyncStorage from '@react-native-async-storage/async-storage';
import { UsersApi } from '../api/users';
import { getSupabase, isSupabaseConfigured } from './supabase';

const CONSENT_STORAGE_PREFIX = '@tedxpune_user_consent_v1_';

export async function hasUserConsented(userId?: string): Promise<boolean> {
  const key = `${CONSENT_STORAGE_PREFIX}${userId || 'guest'}`;
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === 'true') return true;
  } catch (err) {
    console.warn('[Consent] Error reading local consent status:', err);
  }

  // Check Supabase DB directly if local storage is clear
  if (userId && isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('consent')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data?.consent === true) {
        // Cache locally for fast app launches
        await AsyncStorage.setItem(key, 'true').catch(() => {});
        return true;
      }
    } catch (err) {
      console.warn('[Consent] Error fetching consent from Supabase:', err);
    }
  }

  return false;
}

export async function saveUserConsent(userId?: string): Promise<void> {
  const key = `${CONSENT_STORAGE_PREFIX}${userId || 'guest'}`;
  
  let dbUpdated = false;

  // 1. Call dedicated backend endpoint /users/me/consent
  try {
    await UsersApi.updateConsent(true);
    dbUpdated = true;
    console.log('[Consent] Successfully updated consent via /users/me/consent endpoint');
  } catch (err) {
    console.warn('[Consent] /users/me/consent API update error:', err);
  }

  // 2. Direct Supabase client update as backup / sync
  if (userId && isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('users')
        .update({ consent: true })
        .eq('id', userId);

      if (error) {
        console.warn('[Consent] Supabase direct update error:', error.message);
      } else {
        dbUpdated = true;
        console.log('[Consent] Successfully updated consent in Supabase users table for id:', userId);
      }
    } catch (err) {
      console.warn('[Consent] Supabase update exception:', err);
    }
  }

  // Save to local AsyncStorage cache
  try {
    await AsyncStorage.setItem(key, 'true');
  } catch (err) {
    console.warn('[Consent] Error saving local consent status:', err);
  }
}
