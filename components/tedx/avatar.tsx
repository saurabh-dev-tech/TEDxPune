import React, { useState } from 'react';
import { Image, View, Text } from 'react-native';

const palette = [
  '#0F172A', '#7C2D12', '#1E3A8A', '#14532D',
  '#581C87', '#78350F', '#831843', '#164E63',
];
const hashColor = (s: string) =>
  palette[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];

interface AvatarProps {
  name: string;
  size?: number;
  ring?: boolean;
  /** Optional remote avatar URL. Falls back to initials if missing or fails to load. */
  url?: string | null;
}

export function Avatar({ name = '', size = 40, ring = false, url }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const initials = (name || '')
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const showImage = !!url && !failed;
  const bg = hashColor(name || '');

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: bg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
    flexShrink: 0,
    ...(ring && {
      borderWidth: 2.5,
      borderColor: '#E11D2E',
    }),
  };

  if (showImage) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: url! }}
          style={{ width: '100%', height: '100%' }}
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={{ color: '#fff', fontWeight: '600', fontSize: size * 0.38 }}>
        {initials}
      </Text>
    </View>
  );
}
