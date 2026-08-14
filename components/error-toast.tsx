import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setApiErrorHandler, ApiError } from '@/lib/api/client';
import { C } from '@/constants/theme';
import { useTheme } from '@/lib/theme/context';

interface ToastMessage {
  id: string;
  title: string;
  message: string;
}

export function ErrorToastContainer({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { isDark } = useTheme();

  const hideToast = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [fadeAnim]);

  const showToast = useCallback(
    (title: string, message: string) => {
      const id = Date.now().toString();
      setToast({ id, title, message });

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        hideToast();
      }, 4000);
    },
    [fadeAnim, hideToast]
  );

  useEffect(() => {
    setApiErrorHandler((err: ApiError) => {
      const title = err.status === 0 ? 'Network Error' : `Server Error (${err.status})`;
      showToast(title, err.message || 'Failed to communicate with the server. Please try again.');
    });

    return () => setApiErrorHandler(null);
  }, [showToast]);

  return (
    <View style={{ flex: 1 }}>
      {children}

      {toast ? (
        <Animated.View
          style={[
            styles.toastWrapper,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="box-none"
        >
          <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={[styles.toastCard, isDark ? styles.toastDark : styles.toastLight]}>
              <View style={styles.indicator} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, isDark ? styles.textDark : styles.textLight]}>
                  {toast.title}
                </Text>
                <Text style={styles.message} numberOfLines={2}>
                  {toast.message}
                </Text>
              </View>
              <TouchableOpacity onPress={hideToast} style={styles.dismissBtn}>
                <Text style={styles.dismissText}>✕</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  safeArea: {
    width: '100%',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
  },
  toastLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F4F4F5',
  },
  toastDark: {
    backgroundColor: '#18181B',
    borderColor: '#27272A',
  },
  indicator: {
    width: 4,
    height: 36,
    backgroundColor: C.red,
    borderRadius: 2,
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  textLight: {
    color: '#0A0A0A',
  },
  textDark: {
    color: '#F4F4F5',
  },
  message: {
    fontSize: 12,
    color: '#71717A',
    lineHeight: 16,
  },
  dismissBtn: {
    padding: 6,
    marginLeft: 8,
  },
  dismissText: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '600',
  },
});
