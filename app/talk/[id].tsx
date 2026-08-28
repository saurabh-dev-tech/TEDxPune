import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C, Fonts } from '@/constants/theme';
import { TalkThumb } from '@/components/tedx/talk-thumb';
import YoutubePlayer from 'react-native-youtube-iframe';

import { useTheme } from '@/lib/theme/context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PLAYER_HEIGHT = Math.round((SCREEN_WIDTH * 9) / 16); // 16:9 ratio

function SectionHeader({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <View style={{ width: 12, height: 1, backgroundColor: C.red }} />
      <Text style={{
        fontFamily: Fonts.mono, fontSize: 10, color: colors.subtext,
        letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600',
      }}>
        {children}
      </Text>
    </View>
  );
}

export default function TalkPlayerScreen() {
  const { id, title, duration, thumbnail, desc } = useLocalSearchParams<{
    id: string;
    title?: string;
    duration?: string;
    thumbnail?: string;
    desc?: string;
  }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [isSaved, setIsSaved] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  const videoTitle  = title ?? 'TEDx Talk';
  const thumbUri    = thumbnail && thumbnail.length > 0 ? thumbnail : null;
  const description = desc && desc.length > 0 ? desc : null;

  const onStateChange = useCallback((state: string) => {
    if (state === 'ended') setIsPlaying(false);
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${videoTitle}\nhttps://www.youtube.com/watch?v=${id}`,
      });
    } catch { /* cancelled */ }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      {/* Video player — full width, 16:9 */}
      <View style={{ backgroundColor: '#000' }}>
        {/* Back button overlay */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', marginTop: -1 }}>‹</Text>
        </TouchableOpacity>

        {/* Thumbnail shown until player is ready */}
        {!playerReady && thumbUri && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
            <Image
              source={{ uri: thumbUri }}
              style={{ width: '100%', height: PLAYER_HEIGHT }}
              resizeMode="cover"
            />
            <View style={styles.thumbPlayOverlay}>
              <View style={styles.thumbPlayBtn}>
                <View style={styles.thumbPlayTriangle} />
              </View>
            </View>
          </View>
        )}

        <YoutubePlayer
          height={PLAYER_HEIGHT}
          videoId={id}
          play={isPlaying}
          onChangeState={onStateChange}
          onReady={() => {
            setPlayerReady(true);
            setIsPlaying(true);
          }}
          webViewProps={{
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
          }}
          initialPlayerParams={{
            modestbranding: true,
            rel: false,
            preventFullScreen: false,
          }}
        />
      </View>

      {/* Info */}
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Duration */}
        {duration ? (
          <Text style={[styles.durationLabel, { color: colors.subtext }]}>{duration}</Text>
        ) : null}

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>{videoTitle}</Text>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setIsSaved(s => !s)}>
            <Text style={{ fontSize: 18, color: isSaved ? C.red : colors.subtext }}>
              {isSaved ? '♥' : '♡'}
            </Text>
            <Text style={[styles.actionLabel, { color: isSaved ? C.red : colors.subtext }]}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleShare}>
            <Text style={{ fontSize: 18, color: colors.subtext }}>↑</Text>
            <Text style={[styles.actionLabel, { color: colors.subtext }]}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        {description && (
          <View style={{ marginBottom: 20 }}>
            <SectionHeader>About this talk</SectionHeader>
            <Text style={[styles.descText, { color: colors.text }]}>{description}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    position: 'absolute',
    top: 8,
    left: 14,
    zIndex: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Thumbnail overlay while player loads */
  thumbPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlayBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  thumbPlayTriangle: {
    width: 0, height: 0,
    borderTopWidth: 11, borderBottomWidth: 11, borderLeftWidth: 20,
    borderTopColor: 'transparent', borderBottomColor: 'transparent',
    borderLeftColor: C.ink, marginLeft: 4,
  },

  /* Info section */
  durationLabel: {
    fontFamily: Fonts.mono, fontSize: 10, color: C.faint,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.serif, fontSize: 25, lineHeight: 29,
    letterSpacing: -0.4, marginBottom: 14, color: C.ink,
  },
  actionsRow: {
    flexDirection: 'row', gap: 18, marginBottom: 20, alignItems: 'center',
  },
  actionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  actionLabel: {
    fontSize: 12, color: C.slate,
  },
  descText: {
    fontSize: 14, lineHeight: 21.7, color: C.ink,
  },
});
