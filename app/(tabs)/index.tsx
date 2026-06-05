import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, RefreshControl, ActivityIndicator,
  Image, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { C, Fonts } from '@/constants/theme';
import { Avatar } from '@/components/tedx/avatar';
import { useAuth } from '@/lib/auth/context';
import { useApi } from '@/lib/hooks/use-api';
import { PostsApi } from '@/lib/api/posts';
import type { Post, PollOption } from '@/lib/api/types';

/* ── Wordmark ─────────────────────────────────────────────────────────────── */
function Wordmark() {
  return (
    <View style={{ flexDirection: 'column' }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={{ fontWeight: '700', fontSize: 17, letterSpacing: -0.5, color: C.ink }}>pune</Text>
        <Text style={{ fontWeight: '700', fontSize: 17, color: C.red }}>·</Text>
        <Text style={{ fontWeight: '500', fontSize: 17, letterSpacing: -0.5, color: C.ink }}>ideas</Text>
      </View>
      <View style={{ height: 2, width: 24, backgroundColor: C.red, marginTop: 2 }} />
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

/**
 * Convert any video URL into a directly-loadable embed URI.
 * Loading the embed URI directly (source={{ uri }}) avoids the
 * null-origin CSP block that youtube/vimeo apply to html-injected iframes.
 */
function toEmbedUri(url: string): string {
  // YouTube: watch?v=ID  |  youtu.be/ID  |  shorts/ID
  const yt =
    url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?playsinline=1&rel=0`;

  // Vimeo: vimeo.com/ID
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  // Already an embed URL or direct file — use as-is
  return url;
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
      <Text style={{ fontSize: 14, marginRight: 5 }}>{kudoed ? '👏' : '🤝'}</Text>
      <Text style={[styles.kudosLabel, kudoed && { color: C.red }]}>
        Kudos{kudosCount > 0 ? ` · ${kudosCount}` : ''}
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

      {/* ── Image ── */}
      {post.postType === 'image' && !!post.imageUrl && (
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* ── Video ── */}
      {post.postType === 'video' && !!post.videoUrl && (
        <View style={styles.videoContainer}>
          <WebView
            source={{ uri: toEmbedUri(post.videoUrl) }}
            style={{ flex: 1, backgroundColor: '#000' }}
            scrollEnabled={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo
            javaScriptEnabled
          />
        </View>
      )}

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
        <KudosButton
          kudoed={post.kudoed}
          kudosCount={post.kudosCount}
          onPress={handleKudos}
          busy={kudosBusy}
        />
        <View style={styles.footerRight}>
          <View style={styles.footerLine} />
          <Text style={styles.postIndex}>{postNum}</Text>
        </View>
      </View>
    </View>
  );
}

/* ── Screen ───────────────────────────────────────────────────────────────── */
export default function FeedScreen() {
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
      {/* App bar */}
      <View style={styles.appBar}>
        <Wordmark />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ position: 'relative' }}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
            <View style={styles.notifDot} />
          </View>
          <Avatar name={myName} size={30} url={myAvatarUrl} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.red} />}
      >
        {/* Editorial masthead */}
        <View style={styles.masthead}>
          <View style={styles.mastheadLabel}>
            <View style={styles.mastheadLine} />
            <Text style={styles.mastheadMeta}>
              Today's issue · {new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>
          <Text style={styles.mastheadTitle}>
            {'What the\ncommunity is\n'}
            <Text style={{ fontStyle: 'italic' }}>thinking</Text>
            {' today.'}
          </Text>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderInner}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionLabel}>Latest from the community</Text>
          </View>
          {data && <Text style={styles.sectionCount}>{data.total} posts</Text>}
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
    </SafeAreaView>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
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
  mastheadTitle: { fontFamily: Fonts.serif, fontSize: 34, lineHeight: 38, letterSpacing: -0.8, color: C.ink },

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
});
