import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import { C, Fonts } from '@/constants/theme';
import { Avatar } from '@/components/tedx/avatar';
import { PostsApi } from '@/lib/api/posts';
import type { Post, Comment, PollOption } from '@/lib/api/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

export default function PostDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [kudosBusy, setKudosBusy] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [fetchedPost, fetchedComments] = await Promise.all([
        PostsApi.get(id),
        PostsApi.comments(id),
      ]);
      setPost(fetchedPost);

      // Handle direct array or wrapped responses robustly
      let list: Comment[] = [];
      const raw = fetchedComments;
      if (Array.isArray(raw)) {
        list = raw;
      } else if (raw && Array.isArray((raw as any).data)) {
        list = (raw as any).data;
      } else if (raw && Array.isArray((raw as any).items)) {
        list = (raw as any).items;
      } else if (raw && Array.isArray((raw as any).docs)) {
        list = (raw as any).docs;
      }
      setComments(list);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to load post details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleKudos = async () => {
    if (!post || kudosBusy) return;
    setKudosBusy(true);
    const originalPost = { ...post };
    const optimisticKudoed = !post.kudoed;
    const optimisticCount = post.kudosCount + (optimisticKudoed ? 1 : -1);
    setPost({ ...post, kudoed: optimisticKudoed, kudosCount: optimisticCount });

    try {
      const res = await PostsApi.toggleKudos(post.id);
      setPost(prev => prev ? { ...prev, kudoed: res.kudoed, kudosCount: res.kudos_count } : null);
    } catch {
      setPost(originalPost); // rollback
    } finally {
      setKudosBusy(false);
    }
  };

  const [pollBusy, setPollBusy] = useState(false);

  const handleVote = async (optionId: string) => {
    if (!post || pollBusy) return;
    setPollBusy(true);
    try {
      await PostsApi.votePoll(post.id, optionId);
      setPost(prev => prev ? {
        ...prev,
        userVoteOptionId: optionId,
        poll: prev.poll?.map(o => o.id === optionId ? { ...o, voteCount: o.voteCount + 1 } : o)
      } : null);
    } catch (err: any) {
      Alert.alert('Could not cast vote', err?.message ?? 'Try again later.');
    } finally {
      setPollBusy(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!id || !newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await PostsApi.addComment(id, newComment.trim());
      const addedComment: Comment = (res as any).data ?? res;
      setComments(prev => [...prev, addedComment]);
      setNewComment('');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !post) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.red} />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
        <TouchableOpacity style={styles.backButtonText} onPress={() => router.back()}>
          <Text style={{ color: C.red, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const ytId = post.videoUrl ? extractYoutubeId(post.videoUrl) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Content */}
          <View style={styles.postContainer}>
            {/* Author */}
            <View style={styles.authorRow}>
              <Avatar name={post.author.fullName} size={42} url={post.author.avatarUrl} />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{post.author.fullName}</Text>
                {!!post.author.headline && (
                  <Text style={styles.authorHeadline}>{post.author.headline}</Text>
                )}
              </View>
              <Text style={styles.timeText}>{timeAgo(post.createdAt)}</Text>
            </View>

            {/* Body */}
            <Text style={styles.bodyText}>{post.body}</Text>

            {/* Media: Image */}
            {post.postType === 'image' && !!post.imageUrl && (
              <View style={styles.mediaContainer}>
                <Image
                  source={{ uri: post.imageUrl }}
                  style={styles.mediaImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Media: Video */}
            {post.postType === 'video' && !!post.videoUrl && (
              <View style={styles.videoContainer}>
                {ytId ? (
                  <YoutubePlayer
                    height={210}
                    videoId={ytId}
                    play={false}
                    webViewProps={{
                      allowsInlineMediaPlayback: true,
                      mediaPlaybackRequiresUserAction: true,
                    }}
                  />
                ) : (
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
                  />
                )}
              </View>
            )}

            {/* Media: Poll */}
            {post.postType === 'poll' && (post.poll?.length ?? 0) > 0 && (
              <View style={{ marginBottom: 14 }}>
                <PollBlock
                  options={post.poll!}
                  userVoteOptionId={post.userVoteOptionId}
                  onVote={handleVote}
                />
              </View>
            )}

            {/* Kudos Action Footer */}
            <View style={styles.footerRow}>
              <TouchableOpacity
                onPress={handleKudos}
                disabled={kudosBusy}
                style={[styles.kudosBtn, post.kudoed && styles.kudosBtnActive]}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={post.kudoed ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={16}
                  color={post.kudoed ? C.red : C.slate}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.kudosLabel, post.kudoed && { color: C.red, fontWeight: '600' }]}>
                  {post.kudosCount}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments Separator & List */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsHeaderTitle}>Comments ({comments.length})</Text>

            {comments.length === 0 ? (
              <Text style={styles.noCommentsText}>No comments yet. Be the first to reply!</Text>
            ) : (
              comments.map(comment => (
                <View key={comment.id} style={styles.commentRow}>
                  <Avatar name={comment.author.fullName} size={32} url={comment.author.avatarUrl} />
                  <View style={styles.commentContent}>
                    <View style={styles.commentAuthorRow}>
                      <Text style={styles.commentAuthorName}>{comment.author.fullName}</Text>
                      <Text style={styles.commentTimeText}>{timeAgo(comment.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentBodyText}>{comment.body}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Floating Input Row at Bottom */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Add a comment..."
            placeholderTextColor={C.faint}
            value={newComment}
            onChangeText={setNewComment}
            maxLength={1000}
            multiline
          />
          <TouchableOpacity
            onPress={handleCommentSubmit}
            disabled={submitting || !newComment.trim()}
            style={[styles.sendBtn, !newComment.trim() && { opacity: 0.5 }]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.paper,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.paper,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.paper,
  },
  errorText: {
    fontSize: 16,
    color: C.slate,
    marginBottom: 12,
  },
  backButtonText: {
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  postContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
  authorHeadline: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.faint,
    marginTop: 2,
  },
  timeText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.faint,
  },
  bodyText: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    lineHeight: 26,
    color: C.ink,
    marginVertical: 14,
  },
  mediaContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 14,
  },
  mediaImage: {
    width: '100%',
    height: 300,
  },
  videoContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    height: 210,
    backgroundColor: '#000',
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
    marginBottom: 16,
  },
  kudosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: C.paper,
  },
  kudosBtnActive: {
    borderColor: `${C.red}50`,
    backgroundColor: '#FEF2F3',
  },
  kudosLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.slate,
  },
  commentsSection: {
    paddingHorizontal: 16,
  },
  commentsHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.slate,
    marginBottom: 16,
  },
  noCommentsText: {
    fontSize: 13,
    color: C.faint,
    textAlign: 'center',
    marginVertical: 20,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  commentContent: {
    flex: 1,
    backgroundColor: C.mist,
    padding: 12,
    borderRadius: 12,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthorName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
  },
  commentTimeText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.faint,
  },
  commentBodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: C.ink,
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.hair,
    backgroundColor: C.paper,
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: C.mist,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    color: C.ink,
  },
  sendBtn: {
    backgroundColor: C.red,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Poll Styles */
  pollOption: {
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    overflow: 'hidden',
    backgroundColor: C.paper,
  },
  pollOptionChosen: {
    borderColor: C.red,
    backgroundColor: '#FEF2F3',
  },
  pollBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: `${C.red}15`,
  },
  pollOptionText: {
    fontSize: 14,
    color: C.ink,
  },
  pollPct: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: C.slate,
  },
  pollHint: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: C.faint,
    textAlign: 'center',
    marginTop: 2,
  },
});
