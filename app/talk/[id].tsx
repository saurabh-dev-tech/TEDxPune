import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C, Fonts } from '@/constants/theme';
import { TalkThumb } from '@/components/tedx/talk-thumb';
import { WebView } from 'react-native-webview';

function SectionHeader({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <View style={{ width: 12, height: 1, backgroundColor: C.red }} />
      <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.slate, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' }}>
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
  const router    = useRouter();
  const [isSaved,   setIsSaved]   = useState(false);
  const [isPlaying, setIsPlaying] = useState(true); // Auto-play on open

  // `id` is the YouTube video ID (e.g. "dQw4w9WgXcQ")
  const videoTitle = title ?? 'TEDx Talk';
  const thumbUri   = thumbnail && thumbnail.length > 0 ? thumbnail : null;
  const description = desc && desc.length > 0 ? desc : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
        <Text style={{ color: '#fff', fontSize: 18 }}>‹</Text>
      </TouchableOpacity>

      {/* Video stage */}
      <View style={{ height: 230, backgroundColor: C.ink }}>
        {isPlaying ? (
          <WebView
            source={{
              html: `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>*{margin:0;padding:0;overflow:hidden;background:#000}
iframe{width:100%;height:100%;border:0}</style>
</head>
<body>
<iframe
  src="https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1"
  allow="autoplay; encrypted-media; fullscreen"
  allowfullscreen
></iframe>
</body>
</html>`,
              baseUrl: 'https://www.youtube.com',
            }}
            style={{ flex: 1, backgroundColor: C.ink }}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            originWhitelist={['*']}
          />
        ) : (
          <TouchableOpacity onPress={() => setIsPlaying(true)} activeOpacity={0.9} style={{ position: 'relative' }}>
            {thumbUri ? (
              <Image source={{ uri: thumbUri }} style={{ height: 230, width: '100%' }} resizeMode="cover" />
            ) : (
              <TalkThumb seed={videoTitle} height={230} />
            )}
            <View style={styles.playOverlay}>
              <View style={styles.playBtn}>
                <View style={{
                  width: 0, height: 0,
                  borderTopWidth: 11, borderBottomWidth: 11, borderLeftWidth: 20,
                  borderTopColor: 'transparent', borderBottomColor: 'transparent',
                  borderLeftColor: C.ink, marginLeft: 4,
                }} />
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Info scroll */}
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {duration ? (
          <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.faint, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
            {duration}
          </Text>
        ) : null}

        <Text style={{ fontFamily: Fonts.serif, fontSize: 25, lineHeight: 29, letterSpacing: -0.4, marginBottom: 14, color: C.ink }}>
          {videoTitle}
        </Text>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionItem} onPress={() => setIsSaved(s => !s)}>
            <Text style={{ fontSize: 18, color: isSaved ? C.red : C.slate }}>{isSaved ? '♥' : '♡'}</Text>
            <Text style={[styles.actionLabel, isSaved && { color: C.red }]}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <Text style={{ fontSize: 18, color: C.slate }}>↑</Text>
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        {description && (
          <View style={{ marginBottom: 20 }}>
            <SectionHeader>About this talk</SectionHeader>
            <Text style={{ fontSize: 14, lineHeight: 21.7, color: C.ink }}>{description}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    position: 'absolute',
    top: 60,
    left: 14,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  scrubberTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  scrubberFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 3,
    backgroundColor: C.red,
    borderRadius: 2,
  },
  scrubberThumb: {
    position: 'absolute',
    top: -4,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: C.red,
    transform: [{ translateX: -5.5 }],
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.hair,
    marginBottom: 16,
  },
  followBtn: {
    height: 30,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.ink,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 20,
    alignItems: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    fontSize: 12,
    color: C.slate,
  },
});
