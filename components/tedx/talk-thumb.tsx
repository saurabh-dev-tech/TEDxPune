import React from 'react';
import { View, Text, Platform } from 'react-native';

const tones = [
  { bg: '#0A0A0A', fg: '#E11D2E', accent: '#FAFAFA' },
  { bg: '#18181B', fg: '#FAFAFA', accent: '#E11D2E' },
  { bg: '#E11D2E', fg: '#0A0A0A', accent: '#FAFAFA' },
  { bg: '#F4F4F5', fg: '#0A0A0A', accent: '#E11D2E' },
  { bg: '#1C1917', fg: '#E11D2E', accent: '#D4D4D8' },
];

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

interface TalkThumbProps {
  seed: string;
  height?: number;
  topic?: string;
}

export function TalkThumb({ seed, height = 180, topic }: TalkThumbProps) {
  const s = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const variant = s % 5;
  const t = tones[s % tones.length];

  return (
    <View
      style={{
        height,
        width: '100%',
        backgroundColor: t.bg,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* Geometric patterns per variant */}
      {variant === 0 && (
        <>
          <View
            style={{
              position: 'absolute',
              left: '12%',
              top: '20%',
              width: '55%',
              height: '60%',
              borderWidth: 2,
              borderColor: t.fg,
              borderRadius: 999,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: '10%',
              bottom: '15%',
              width: 40,
              height: 3,
              backgroundColor: t.accent,
            }}
          />
        </>
      )}

      {variant === 1 && (
        <>
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '60%',
              height: '100%',
              backgroundColor: t.fg,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: '45%',
              top: '25%',
              width: '40%',
              height: '50%',
              backgroundColor: t.accent,
            }}
          />
        </>
      )}

      {variant === 2 && (
        <>
          <View
            style={{
              position: 'absolute',
              right: '15%',
              top: '30%',
              width: '35%',
              height: '40%',
              borderWidth: 2,
              borderColor: t.accent,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: '10%',
              bottom: '20%',
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: t.fg,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: '20%',
              top: '20%',
              width: '25%',
              height: 3,
              backgroundColor: t.accent,
            }}
          />
        </>
      )}

      {variant === 3 && (
        <>
          <View
            style={{
              position: 'absolute',
              left: '15%',
              top: '15%',
              width: 4,
              height: '70%',
              backgroundColor: t.fg,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: '25%',
              top: '30%',
              width: '60%',
              height: 4,
              backgroundColor: t.fg,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: '20%',
              bottom: '20%',
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: t.accent,
            }}
          />
        </>
      )}

      {variant === 4 && (
        <View
          style={{
            position: 'absolute',
            bottom: height * 0.15,
            left: '8%',
            right: '8%',
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 5,
            height: height * 0.65,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map(i => (
            <View
              key={i}
              style={{
                flex: 1,
                height: (20 + ((s + i * 7) % 55)) / 100 * height * 0.65,
                backgroundColor: i % 2 ? t.fg : t.accent,
              }}
            />
          ))}
        </View>
      )}

      {/* Topic label */}
      {topic && (
        <View
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: `${t.bg}CC`,
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderRadius: 3,
          }}
        >
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: t.accent,
            }}
          >
            {topic}
          </Text>
        </View>
      )}

      {/* Play button */}
      <View
        style={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: `${t.bg}E6`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 0,
            height: 0,
            borderTopWidth: 5,
            borderBottomWidth: 5,
            borderLeftWidth: 9,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: t.accent,
            marginLeft: 2,
          }}
        />
      </View>
    </View>
  );
}
