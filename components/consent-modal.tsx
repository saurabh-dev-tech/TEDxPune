import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, Fonts } from '@/constants/theme';
import { useTheme } from '@/lib/theme/context';
import { saveUserConsent } from '@/lib/auth/consent';

interface ConsentModalProps {
  visible: boolean;
  userId?: string;
  onConsentAccepted: () => void;
}

export function ConsentModal({ visible, userId, onConsentAccepted }: ConsentModalProps) {
  const { isDark } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAccept = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await saveUserConsent(userId);
      await onConsentAccepted();
    } catch (err: any) {
      console.error('[ConsentModal] Error saving consent:', err);
      setErrorMsg(err?.message || 'Failed to save consent. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>WELCOME TO TEDXPUNE</Text>
          </View>
          <Text style={[styles.title, isDark ? styles.textDark : styles.textLight]}>
            Terms & Privacy Consent
          </Text>
          <Text style={styles.subtitle}>
            Please review and accept our terms before continuing to the TEDxPune community.
          </Text>
        </View>

        <ScrollView
          style={[styles.scrollArea, isDark ? styles.scrollDark : styles.scrollLight]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
            1. Data Storage & Privacy Consent
          </Text>
          <Text style={styles.bodyText}>
            By continuing, you grant TEDxPune consent to store and process your personal information, including your full name, email address, user ID, and profile details, required to create and manage your account.
          </Text>

          <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
            2. Community Guidelines & Usage
          </Text>
          <Text style={styles.bodyText}>
            TEDxPune is a vibrant, inclusive community dedicated to ideas worth spreading. Members are expected to communicate respectfully, engage thoughtfully, and uphold TED values in all interactions.
          </Text>

          <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
            3. Notifications & Communications
          </Text>
          <Text style={styles.bodyText}>
            With your consent, the application may send push notifications for event updates, schedule changes, live speaker announcements, and community messages.
          </Text>

          <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
            4. Terms of Service
          </Text>
          <Text style={styles.bodyText}>
            By tapping {"\"I Agree & Continue\""}, you confirm that you are at least 13 years of age, consent to the storage of your profile data, and agree to our Terms of Service & Privacy Policy.
          </Text>
        </ScrollView>

        <View style={[styles.footer, isDark ? styles.footerDark : styles.footerLight]}>
          {errorMsg ? (
            <Text style={{ color: C.red, fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
              {errorMsg}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.button}
            onPress={handleAccept}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>I Agree & Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightBg: {
    backgroundColor: C.paper,
  },
  darkBg: {
    backgroundColor: C.darkPaper,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: C.redSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeText: {
    color: C.red,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.mono,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  textLight: {
    color: '#0A0A0A',
  },
  textDark: {
    color: '#F4F4F5',
  },
  subtitle: {
    fontSize: 14,
    color: '#71717A',
    lineHeight: 20,
  },
  scrollArea: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  scrollLight: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E4E4E7',
  },
  scrollDark: {
    backgroundColor: '#18181B',
    borderColor: '#27272A',
  },
  scrollContent: {
    padding: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 13,
    color: '#71717A',
    lineHeight: 19,
    marginBottom: 14,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  footerLight: {
    borderColor: '#E4E4E7',
  },
  footerDark: {
    borderColor: '#27272A',
  },
  button: {
    backgroundColor: C.red,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
