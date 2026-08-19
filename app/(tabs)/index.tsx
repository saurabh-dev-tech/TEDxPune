import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, RefreshControl, ActivityIndicator,
  Image, Alert, useColorScheme, Modal, Dimensions,
  TextInput, KeyboardAvoidingView,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, Fonts } from '@/constants/theme';
import { Avatar } from '@/components/tedx/avatar';
import { useAuth } from '@/lib/auth/context';
import { useApi } from '@/lib/hooks/use-api';
import { PostsApi } from '@/lib/api/posts';
import type { Post, PollOption, Comment } from '@/lib/api/types';

import { MaxWidthContainer } from '@/components/tedx/max-width-container';

/* ── Wordmark ─────────────────────────────────────────────────────────────── */
function Wordmark() {
  const colorScheme = useColorScheme();
  const textColor = colorScheme === 'dark' ? '#ffffff' : '#000000';
  const logo = colorScheme === 'dark'
    ? require('@/assets/images/logo-white.png')
    : require('@/assets/images/logo-black.png');

  return (
    <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>

      <Image
        source={logo}
        style={{ width: 180, height: 60 }}
        resizeMode="contain"
      />
    </View>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

const ACCENT: Record<string, string> = {
  text:  C.red,
  image: '#3B82F6',
  video: '#A855F7',
  poll:  '#F59E0B',
};

/** Extract YouTube video ID from any URL format, or return null. */
function extractYoutubeId(url: string): string | null {
  const match =
    url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/* ── Poll block ───────────────────────────────────────────────────────────── */
function PollBlock({
  options,
  userVoteOptionId,
  onVote,
}: {
  options: PollOption[];
  userVoteOptionId: string | null | undefined;
  onVote: (optionId: string) => void;
}) {
  const hasVoted = !!userVoteOptionId;
  const totalVotes = options.reduce((s, o) => s + o.voteCount, 0);

  return (
    <View style={{ gap: 8, marginTop: 12 }}>
      {options.map(opt => {
        const isChosen = opt.id === userVoteOptionId;
        const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;

        return (
          <TouchableOpacity
            key={opt.id}
            disabled={hasVoted}
            onPress={() => onVote(opt.id)}
            activeOpacity={0.75}
            style={[styles.pollOption, isChosen && styles.pollOptionChosen]}
          >
            {/* Vote bar */}
            {hasVoted && (
              <View style={[styles.pollBar, { width: `${pct}%` as any }]} />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
              <Text style={[styles.pollOptionText, isChosen && { color: C.red, fontWeight: '600' }]}>
                {isChosen ? '✓ ' : ''}{opt.optionText}
              </Text>
              {hasVoted && (
                <Text style={styles.pollPct}>{pct}%</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
      {!hasVoted && (
        <Text style={styles.pollHint}>Tap an option to vote</Text>
      )}
      {hasVoted && (
        <Text style={styles.pollHint}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</Text>
      )}
    </View>
  );
}

/* ── Kudos button ─────────────────────────────────────────────────────────── */
function KudosButton({
  kudoed, kudosCount, onPress, busy,
}: {
  kudoed: boolean; kudosCount: number; onPress: () => void; busy: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      style={[styles.kudosBtn, kudoed && styles.kudosBtnActive]}
      activeOpacity={0.75}
    >
      <Ionicons
        name={kudoed ? 'thumbs-up' : 'thumbs-up-outline'}
        size={16}
        color={kudoed ? C.red : C.slate}
        style={{ marginRight: 6 }}
      />
      <Text style={[styles.kudosLabel, kudoed && { color: C.red, fontWeight: '600' }]}>
        {kudosCount}
      </Text>
    </TouchableOpacity>
  );
}

/* ── Post card ────────────────────────────────────────────────────────────── */
function LivePostCard({
  post, index, onKudosToggled, onPollVoted,
}: {
  post: Post;
  index: number;
  onKudosToggled: (id: string, kudoed: boolean, kudosCount: number) => void;
  onPollVoted: (id: string, optionId: string) => void;
}) {
  const router = useRouter();
  const [kudosBusy, setKudosBusy] = useState(false);
  const [pollBusy,  setPollBusy]  = useState(false);
  const postNum = String(index + 1).padStart(2, '0');
  const accent  = ACCENT[post.postType] ?? C.red;

  const handleKudos = async () => {
    if (kudosBusy) return;
    setKudosBusy(true);
    const optimisticKudoed = !post.kudoed;
    const optimisticCount  = post.kudosCount + (optimisticKudoed ? 1 : -1);
    onKudosToggled(post.id, optimisticKudoed, optimisticCount);
    try {
      const res = await PostsApi.toggleKudos(post.id);
      onKudosToggled(post.id, res.kudoed, res.kudos_count);
    } catch {
      onKudosToggled(post.id, post.kudoed, post.kudosCount); // rollback
    } finally {
      setKudosBusy(false);
    }
  };

  const handleVote = async (optionId: string) => {
    if (pollBusy) return;
    setPollBusy(true);
    try {
      await PostsApi.votePoll(post.id, optionId);
      onPollVoted(post.id, optionId);
    } catch (err: any) {
      Alert.alert('Could not cast vote', err?.message ?? 'Try again later.');
    } finally {
      setPollBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Colour accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: accent }]} />

      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => router.push(`/post/${post.id}`)}
      >
        {/* Author row */}
        <View style={styles.cardHeader}>
          <Avatar name={post.author.fullName} size={42} url={post.author.avatarUrl} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.author.fullName}</Text>
            {!!post.author.headline && (
              <Text style={styles.authorHeadline}>{post.author.headline}</Text>
            )}
          </View>
          <View style={styles.timePill}>
            <Text style={styles.timeText}>{timeAgo(post.createdAt)}</Text>
          </View>
        </View>

        {/* Body */}
        <Text style={styles.bodyText}>{post.body}</Text>
      </TouchableOpacity>

      {/* ── Image ── */}
      {post.postType === 'image' && !!post.imageUrl && (
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => router.push(`/post/${post.id}`)}
          style={styles.mediaContainer}
        >
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {/* ── Video ── */}
      {post.postType === 'video' && !!post.videoUrl && (() => {
        const ytId = extractYoutubeId(post.videoUrl);
        if (ytId) {
          return (
            <View style={styles.videoContainer}>
              <YoutubePlayer
                height={200}
                videoId={ytId}
                play={false}
                webViewProps={{
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserAction: true,
                }}
                initialPlayerParams={{
                  modestbranding: true,
                  rel: false,
                  preventFullScreen: false,
                }}
              />
            </View>
          );
        }

        // Fallback for direct video links (e.g. Cloudinary, Supabase)
        return (
          <View style={styles.videoContainer}>
            <WebView
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                      <style>
                        body, html { margin: 0; padding: 0; background: #000; width: 100%; height: 100%; overflow: hidden; display: flex; justify-content: center; align-items: center; }
                        video { width: 100%; height: 100%; object-fit: contain; }
                      </style>
                    </head>
                    <body>
                      <video id="video-player" controls playsinline>
                        <source src="${post.videoUrl}" type="video/mp4">
                      </video>
                    </body>
                  </html>
                `
              }}
              style={{ flex: 1, backgroundColor: '#000' }}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          </View>
        );
      })()}

      {/* ── Poll ── */}
      {post.postType === 'poll' && (post.poll?.length ?? 0) > 0 && (
        <View style={{ paddingHorizontal: 16 }}>
          <PollBlock
            options={post.poll!}
            userVoteOptionId={post.userVoteOptionId}
            onVote={handleVote}
          />
        </View>
      )}

      {/* Footer: kudos + index */}
      <View style={styles.cardFooter}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <KudosButton
            kudoed={post.kudoed}
            kudosCount={post.kudosCount}
            onPress={handleKudos}
            busy={kudosBusy}
          />
          <TouchableOpacity
            onPress={() => router.push(`/post/${post.id}`)}
            style={styles.commentBtn}
            activeOpacity={0.75}
          >
            <Ionicons
              name="chatbubble-outline"
              size={16}
              color={C.slate}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.commentLabel}>
              {post.commentsCount ?? 0}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footerRight}>
          {/* <View style={styles.footerLine} /> */}
          {/* <Text style={styles.postIndex}>{postNum}</Text> */}
        </View>
      </View>
    </View>
  );
}

/* ── Screen ───────────────────────────────────────────────────────────────── */
export default function FeedScreen() {
  const router = useRouter();
  const { user, claims } = useAuth();
  const myAvatarUrl = user?.avatarUrl ?? (claims?.picture as string | undefined) ?? null;
  const myName      = user?.fullName  ?? (claims?.name  as string | undefined) ?? 'You Me';
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch, mutate } = useApi(
    () => PostsApi.feed(1, 20),
    []
  );

  useFocusEffect(useCallback(() => { refetch().catch(() => {}); }, [refetch]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } catch {} finally { setRefreshing(false); }
  }, [refetch]);

  const handleKudosToggled = useCallback((id: string, kudoed: boolean, kudosCount: number) => {
    mutate(prev => prev
      ? { ...prev, data: prev.data.map(p => p.id === id ? { ...p, kudoed, kudosCount } : p) }
      : prev!
    );
  }, [mutate]);

  const handlePollVoted = useCallback((postId: string, optionId: string) => {
    mutate(prev => prev
      ? {
          ...prev,
          data: prev.data.map(p => p.id === postId
            ? {
                ...p,
                userVoteOptionId: optionId,
                poll: p.poll?.map(o => o.id === optionId ? { ...o, voteCount: o.voteCount + 1 } : o),
              }
            : p
          ),
        }
      : prev!
    );
  }, [mutate]);

  const posts = data?.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.mist }}>
      <MaxWidthContainer style={{ backgroundColor: C.mist }}>
        {/* App bar */}
        <View style={styles.appBar}>
          <Wordmark />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              activeOpacity={0.7}
              style={{ position: 'relative' }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ fontSize: 22 }}>🔔</Text>
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.navigate('/profile')} activeOpacity={0.7}>
              <Avatar name={myName} size={30} url={myAvatarUrl} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.red} />}
        >
          {/* Editorial masthead */}
          <View style={styles.masthead}>
            <Text style={styles.mastheadTitle}>
              {'Hi ' + myName + '!'}
            </Text>
          </View>

          {/* Section header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderInner}>
              {/* <View style={styles.sectionDot} /> */}
            </View>
            {/* {data && <Text style={styles.sectionCount}>{data.total} posts</Text>} */}
          </View>

          {/* Loading */}
          {loading && posts.length === 0 && (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator color={C.red} size="large" />
              <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: C.faint, marginTop: 12, letterSpacing: 1 }}>LOADING…</Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <View style={[styles.cardAccent, { backgroundColor: C.red }]} />
              <View style={{ padding: 16 }}>
                <Text style={styles.errorTitle}>Couldn't load feed</Text>
                <Text style={styles.errorMsg}>{error.message}</Text>
                <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Empty */}
          {!loading && !error && posts.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✦</Text>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyBody}>Be the first to share an idea with the community.</Text>
            </View>
          )}

          {/* Posts */}
          {posts.map((post, i) => (
            <LivePostCard
              key={post.id}
              post={post}
              index={i}
              onKudosToggled={handleKudosToggled}
              onPollVoted={handlePollVoted}
            />
          ))}
        </ScrollView>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const shadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  appBar: {
    backgroundColor: C.mist, paddingHorizontal: 18, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  notifDot: {
    position: 'absolute', top: 0, right: 0,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.red, borderWidth: 1.5, borderColor: C.mist,
  },

  /* Masthead */
  masthead: {
    backgroundColor: C.paper, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24,
    marginBottom: 2, borderBottomWidth: 1, borderBottomColor: C.hair,
  },
  mastheadLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mastheadLine: { width: 16, height: 1.5, backgroundColor: C.red, marginRight: 8 },
  mastheadMeta: { fontFamily: Fonts.mono, fontSize: 10, color: C.red, letterSpacing: 1.8, textTransform: 'uppercase' },
  mastheadTitle: { fontFamily: Fonts.serif, fontSize: 24, lineHeight: 38, letterSpacing: -0.8, color: C.ink },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
  },
  sectionHeaderInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red },
  sectionLabel: { fontFamily: Fonts.mono, fontSize: 10, color: C.slate, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' },
  sectionCount: { fontFamily: Fonts.mono, fontSize: 10, color: C.faint },

  /* Card */
  card: { backgroundColor: C.paper, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: 'hidden', ...shadow },
  cardAccent: { height: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '700', color: C.ink, letterSpacing: -0.2 },
  authorHeadline: { fontFamily: Fonts.mono, fontSize: 10, color: C.faint, marginTop: 2 },
  timePill: { backgroundColor: C.mist, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  timeText: { fontFamily: Fonts.mono, fontSize: 10, color: C.slate },

  /* Body */
  bodyText: { fontFamily: Fonts.serif, fontSize: 16, lineHeight: 26, color: C.ink, paddingHorizontal: 16, paddingTop: 14 },

  /* Image */
  mediaContainer: { marginHorizontal: 16, marginTop: 14, borderRadius: 10, overflow: 'hidden' },
  mediaImage: { width: '100%', height: 200 },

  /* Video */
  videoContainer: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 10,
    overflow: 'hidden',
    height: 210,
    backgroundColor: '#000',
  },

  /* Poll */
  pollOption: {
    borderWidth: 1, borderColor: C.hair, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, overflow: 'hidden',
    backgroundColor: C.paper,
  },
  pollOptionChosen: { borderColor: C.red, backgroundColor: '#FEF2F3' },
  pollBar: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: `${C.red}15` },
  pollOptionText: { fontSize: 14, color: C.ink },
  pollPct: { fontFamily: Fonts.mono, fontSize: 11, color: C.slate },
  pollHint: { fontFamily: Fonts.mono, fontSize: 10, color: C.faint, textAlign: 'center', marginTop: 2 },

  /* Kudos button */
  kudosBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: C.hair,
    backgroundColor: C.paper,
  },
  kudosBtnActive: { borderColor: `${C.red}50`, backgroundColor: '#FEF2F3' },
  kudosLabel: { fontSize: 13, fontWeight: '500', color: C.slate },

  /* Footer */
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14,
  },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' },
  footerLine: { flex: 1, maxWidth: 60, height: 1, backgroundColor: C.hair },
  postIndex: { fontFamily: Fonts.mono, fontSize: 10, color: C.faint, letterSpacing: 1.5 },

  /* Error */
  errorBox: { marginHorizontal: 16, marginVertical: 8, backgroundColor: C.paper, borderRadius: 14, overflow: 'hidden', ...shadow },
  errorTitle: { fontFamily: Fonts.mono, fontSize: 10, color: C.red, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  errorMsg: { fontSize: 13, color: C.slate, marginBottom: 14, lineHeight: 20 },
  retryBtn: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.red, borderRadius: 8 },
  retryText: { color: C.paper, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },

  /* Empty */
  emptyState: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  emptyIcon: { fontSize: 28, color: C.red, marginBottom: 12 },
  emptyTitle: { fontFamily: Fonts.serif, fontSize: 20, color: C.ink, marginBottom: 8, letterSpacing: -0.3 },
  emptyBody: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },

  /* Modal Styles */
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  /* Comment button */
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: C.paper,
  },
  commentLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.slate,
  },

  /* Inline Comments Styles */
  inlineCommentsContainer: {
    borderTopWidth: 1,
    borderTopColor: C.hair,
    paddingTop: 10,
    backgroundColor: C.paper,
  },
  noCommentsTextInline: {
    textAlign: 'center',
    color: C.faint,
    fontSize: 12,
    marginVertical: 10,
  },
  inlineCommentRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  inlineCommentContent: {
    flex: 1,
    backgroundColor: C.mist,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  inlineCommentAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  inlineCommentAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: C.ink,
  },
  inlineCommentTime: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: C.faint,
  },
  inlineCommentBody: {
    fontSize: 13,
    lineHeight: 18,
    color: C.ink,
  },
  inlineCommentInputRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.hair,
    alignItems: 'center',
    gap: 8,
  },
  inlineCommentInput: {
    flex: 1,
    backgroundColor: C.mist,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxHeight: 80,
    fontSize: 13,
    color: C.ink,
  },
  inlineCommentSendBtn: {
    backgroundColor: C.red,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
