import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
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

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.faint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: C.paper,
          borderTopWidth: 1,
          borderTopColor: C.hair,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 3,
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
