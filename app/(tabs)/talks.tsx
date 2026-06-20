import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C, Fonts } from '@/constants/theme';
import { TalkThumb } from '@/components/tedx/talk-thumb';
import { VideosApi } from '@/lib/api/videos';
import type { Playlist, Video } from '@/lib/api/types';
import { MaxWidthContainer } from '@/components/tedx/max-width-container';

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function formatDuration(dur: string | null | undefined): string {
  if (!dur) return '';
  // If already HH:MM:SS or MM:SS, return as-is
  if (/^\d+:\d+/.test(dur)) return dur;
  // ISO 8601 duration: PT1H2M3S
  const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return dur;
  const h = parseInt(match[1] ?? '0');
  const m = parseInt(match[2] ?? '0');
  const s = parseInt(match[3] ?? '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ── Video card (grid) ────────────────────────────────────────────────────── */
function VideoCard({ video, onPress }: { video: Video; onPress: () => void }) {
  return (
    <TouchableOpacity style={{ flex: 1 }} onPress={onPress} activeOpacity={0.85}>
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {video.thumbnailUrl ? (
          <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbImg} resizeMode="cover" />
        ) : (
          <TalkThumb seed={video.title} height={118} />
        )}
        {/* Duration badge */}
        {!!video.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
          </View>
        )}
        {/* Play icon */}
        <View style={styles.playOverlay}>
          <View style={styles.playBtn}>
            <View style={styles.playTriangle} />
          </View>
        </View>
      </View>
      {/* Meta */}
      <View style={{ paddingTop: 8, paddingHorizontal: 2 }}>
        <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
        {video.publishedAt && (
          <Text style={styles.videoMeta}>
            {new Date(video.publishedAt).getFullYear()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ── Featured card ────────────────────────────────────────────────────────── */
function FeaturedCard({ video, onPress }: { video: Video; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.9}>
      <View style={{ height: 200, width: '100%' }}>
        {video.thumbnailUrl ? (
          <Image source={{ uri: video.thumbnailUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <TalkThumb seed={video.title} height={200} />
        )}
        {/* Duration badge */}
        {!!video.duration && (
          <View style={[styles.durationBadge, { bottom: 10, right: 10 }]}>
            <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
          </View>
        )}
        {/* Play overlay */}
        <View style={styles.featuredPlayOverlay}>
          <View style={[styles.playBtn, { width: 56, height: 56, borderRadius: 28 }]}>
            <View style={[styles.playTriangle, { borderLeftWidth: 16, borderTopWidth: 9, borderBottomWidth: 9 }]} />
          </View>
        </View>
      </View>
      <View style={{ padding: 14 }}>
        <Text style={styles.featuredTitle} numberOfLines={2}>{video.title}</Text>
        {video.description ? (
          <Text style={styles.featuredDesc} numberOfLines={2}>{video.description}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/* ── Screen ───────────────────────────────────────────────────────────────── */
export default function TalksScreen() {
  const router = useRouter();
  const [playlists,    setPlaylists]    = useState<Playlist[]>([]);
  const [activeId,     setActiveId]     = useState<string | null>(null);
  const [videos,       setVideos]       = useState<Video[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingVids,  setLoadingVids]  = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Fetch playlists on mount
  useEffect(() => {
    (async () => {
      try {
        const lists = await VideosApi.listPlaylists();
        const active = lists.filter(p => p.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
        setPlaylists(active);
        if (active.length > 0) setActiveId(active[0].id);
      } catch (e: any) {
        setError(e?.message ?? 'Could not load playlists');
      } finally {
        setLoadingLists(false);
      }
    })();
  }, []);

  // Fetch videos when active playlist changes
  const fetchVideos = useCallback(async (playlistId: string) => {
    setLoadingVids(true);
    setError(null);
    try {
      const { data } = await VideosApi.listVideos(playlistId, 1, 30);
      setVideos(data.filter(v => v.isActive));
    } catch (e: any) {
      setError(e?.message ?? 'Could not load videos');
      setVideos([]);
    } finally {
      setLoadingVids(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) fetchVideos(activeId);
  }, [activeId, fetchVideos]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeId) await fetchVideos(activeId).catch(() => {});
    setRefreshing(false);
  };

  function navigateToVideo(video: Video) {
    router.push({
      pathname: '/talk/[id]',
      params: {
        id:        video.youtubeVideoId,
        title:     video.title,
        duration:  formatDuration(video.duration),
        thumbnail: video.thumbnailUrl ?? '',
        desc:      video.description ?? '',
      },
    });
  }

  const featured = videos[0] ?? null;
  const grid     = videos.slice(1);
  const activePlaylist = playlists.find(p => p.id === activeId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}>
      <MaxWidthContainer style={{ backgroundColor: C.paper }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.headerEyebrow}>02 / talks</Text>
            <Text style={styles.headerTitle}>Talks worth{'\n'}rewatching</Text>
          </View>

          {/* Playlist tabs */}
          {loadingLists ? (
            <ActivityIndicator color={C.red} size="small" style={{ alignSelf: 'flex-start', marginBottom: 4 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 7 }}>
                {playlists.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setActiveId(p.id)}
                    style={[styles.chip, activeId === p.id && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, activeId === p.id && styles.chipTextActive]}>
                      {p.playlistName}
                    </Text>
                    {(p.videoCount ?? 0) > 0 && (
                      <Text style={[styles.chipCount, activeId === p.id && { color: 'rgba(255,255,255,0.6)' }]}>
                        {' '}{p.videoCount}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.red} />}
        >
          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => activeId && fetchVideos(activeId)}>
                <Text style={{ fontSize: 12, color: C.red, fontWeight: '600', marginTop: 6 }}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading */}
          {loadingVids && (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator color={C.red} size="large" />
              <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.faint, marginTop: 12, letterSpacing: 1 }}>
                LOADING…
              </Text>
            </View>
          )}

          {/* Empty */}
          {!loadingVids && !error && videos.length === 0 && (
            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginBottom: 12 }}>📺</Text>
              <Text style={{ fontFamily: Fonts.serif, fontSize: 18, color: C.ink, marginBottom: 6 }}>No talks yet</Text>
              <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>
                Videos in this playlist will appear here.
              </Text>
            </View>
          )}

          {/* Featured */}
          {!loadingVids && featured && (
            <>
              <Text style={styles.sectionLabel}>★  Editor's pick</Text>
              <FeaturedCard video={featured} onPress={() => navigateToVideo(featured)} />
            </>
          )}

          {/* Archive grid */}
          {!loadingVids && grid.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.archiveLabel}>
                  {activePlaylist?.category ? `${activePlaylist.category} · ` : ''}
                  {grid.length} talk{grid.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.grid}>
                {grid.map(v => (
                  <View key={v.id} style={{ width: '47%' }}>
                    <VideoCard video={v} onPress={() => navigateToVideo(v)} />
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* Header */
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 },
  headerEyebrow: { fontFamily: Fonts.mono, fontSize: 10, color: C.faint, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  headerTitle: { fontFamily: Fonts.serif, fontSize: 28, fontWeight: '400', letterSpacing: -0.6, color: C.ink, lineHeight: 30, marginBottom: 14 },

  /* Chips */
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: C.paper, borderWidth: 1, borderColor: C.hair, flexDirection: 'row', alignItems: 'center' },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 13, fontWeight: '500', color: C.slate },
  chipTextActive: { color: C.paper },
  chipCount: { fontFamily: Fonts.mono, fontSize: 10, color: C.faint },

  /* Thumbnails */
  thumbWrap: { borderRadius: 10, overflow: 'hidden', position: 'relative', height: 118 },
  thumbImg: { width: '100%', height: '100%' },
  durationBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  durationText: { fontFamily: Fonts.mono, fontSize: 9, color: '#fff', letterSpacing: 0.5 },
  playOverlay: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' } as any,
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  playTriangle: { width: 0, height: 0, borderTopWidth: 6, borderBottomWidth: 6, borderLeftWidth: 10, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: C.ink, marginLeft: 2 },
  videoTitle: { fontSize: 13, fontWeight: '600', lineHeight: 17, color: C.ink, marginBottom: 3 },
  videoMeta: { fontFamily: Fonts.mono, fontSize: 10, color: C.faint, letterSpacing: 0.5 },

  /* Featured */
  featuredCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.hair, marginBottom: 4 },
  featuredPlayOverlay: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' } as any,
  featuredTitle: { fontFamily: Fonts.serif, fontSize: 19, lineHeight: 24, letterSpacing: -0.3, color: C.ink, marginBottom: 4 },
  featuredDesc: { fontSize: 13, color: C.slate, lineHeight: 19 },

  /* Sections */
  sectionLabel: { fontFamily: Fonts.mono, fontSize: 10, color: C.red, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 4, fontWeight: '600', marginLeft: 4 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22, marginBottom: 10, paddingHorizontal: 4 },
  archiveLabel: { fontFamily: Fonts.mono, fontSize: 10, color: C.slate, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },

  /* Error */
  errorBox: { marginBottom: 16, padding: 14, borderRadius: 10, backgroundColor: C.redSoft, borderWidth: 1, borderColor: `${C.red}30` },
  errorText: { fontSize: 13, color: C.slate },
});
