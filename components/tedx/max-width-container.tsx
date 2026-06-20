import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

interface ContainerProps {
  children: React.ReactNode;
  style?: any;
}

export function MaxWidthContainer({ children, style }: ContainerProps) {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  return (
    <View style={[styles.root, isTablet && styles.tabletRoot]}>
      <View style={[styles.inner, isTablet && styles.tabletInner, style]}>
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
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
  },
  tabletInner: {
    maxWidth: 720,
    width: '100%',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e2e8f0', // soft border to define screen area
  },
});
