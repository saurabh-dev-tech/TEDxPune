import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { HapticTab } from '@/components/haptic-tab';
import { C } from '@/constants/theme';

function FeedIcon({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
      {/* Three stacked lines */}
      <View style={{ width: 18, height: 2, backgroundColor: color, borderRadius: 1, marginBottom: 3 }} />
      <View style={{ width: 14, height: 2, backgroundColor: color, borderRadius: 1, marginBottom: 3 }} />
      <View style={{ width: 18, height: 2, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

function TalksIcon({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
      <View style={{ width: 20, height: 14, borderWidth: 1.6, borderColor: color, borderRadius: 3 }} />
      <View style={{
        position: 'absolute',
        width: 0, height: 0,
        borderTopWidth: 4, borderBottomWidth: 4, borderLeftWidth: 7,
        borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color,
        marginLeft: 2,
      }} />
    </View>
  );
}

function DirectoryIcon({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.6, borderColor: color }} />
      <View style={{ position: 'absolute', bottom: 2, right: 3, width: 6, height: 6, transform: [{ rotate: '45deg' }], borderRightWidth: 1.6, borderBottomWidth: 1.6, borderColor: color, marginTop: 2 }} />
    </View>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.6, borderColor: color, marginBottom: 2 }} />
      <View style={{ width: 18, height: 7, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderWidth: 1.6, borderColor: color, borderBottomWidth: 0 }} />
    </View>
  );
}

/**
 * iOS 26 "Liquid Glass" tab background.
 *
 * Rendered behind the tab bar when it's set to position:absolute with
 * a transparent backgroundColor. `tint="systemChromeMaterial"` resolves
 * to the OS's adaptive material (Liquid Glass on iOS 26+, vibrancy on
 * earlier versions). A 1px hairline mirrors the system tab bar.
 */
function GlassTabBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        tint="systemChromeMaterial"
        intensity={100}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: 'rgba(60,60,67,0.18)',
        }}
      />
    </View>
  );
}

import { useWindowDimensions } from 'react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  // Bar HEIGHT (incl. label & icon) + bottom inset (gesture/home indicator).
  // Same content height on both platforms — only the inset differs.
  const BAR_CONTENT_HEIGHT = 56;
  const tabBarHeight = BAR_CONTENT_HEIGHT + insets.bottom;

  const baseTabStyle: any = isIOS
    ? {
        position: 'absolute',
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        height: tabBarHeight,
        paddingTop: 8,
        paddingBottom: insets.bottom,
        elevation: 0,
        shadowOpacity: 0,
      }
    : {
        backgroundColor: C.paper,
        borderTopWidth: 1,
        borderTopColor: C.hair,
        height: tabBarHeight,
        paddingTop: 8,
        paddingBottom: insets.bottom + 4,
        elevation: 0,
        shadowOpacity: 0,
      };

  const tabletTabStyle: any = isTablet
    ? {
        position: 'absolute',
        width: 720,
        left: '50%',
        marginLeft: -360,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: C.paper, // solid background on tablet so transparent iOS blur doesn't look weird when centered
      }
    : {};

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.faint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          ...baseTabStyle,
          ...tabletTabStyle,
        },
        tabBarBackground: (isIOS && !isTablet) ? GlassTabBackground : undefined,
        // Slight nudge so labels read on the blurred bg on iOS
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 3,
        },
        tabBarItemStyle: {
          // Make sure the full button area (incl. label) is hit-testable —
          // RN Bottom Tabs sometimes leaves the label without a hitSlop on Android.
          paddingVertical: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <FeedIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="talks"
        options={{
          title: 'Talks',
          tabBarIcon: ({ color }) => <TalksIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          tabBarIcon: ({ color }) => <DirectoryIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
      {/* Hide the old explore tab */}
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
    </Tabs>
  );
}
