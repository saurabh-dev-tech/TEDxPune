import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '@/lib/theme/context';

interface ContainerProps {
  children: React.ReactNode;
  style?: any;
}

export function MaxWidthContainer({ children, style }: ContainerProps) {
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const isTablet = width > 768;

  return (
    <View style={[styles.root, isTablet && [styles.tabletRoot, { backgroundColor: isDark ? '#121214' : '#ECECEE' }]]}>
      <View style={[styles.inner, isTablet && [styles.tabletInner, { borderColor: isDark ? '#27272A' : '#E4E4E7' }], style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },
  tabletRoot: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  inner: {
    flex: 1,
    width: '100%',
  },
  tabletInner: {
    maxWidth: 820,
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
});

