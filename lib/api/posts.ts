import { api } from './client';
import type { Comment, Paginated, PollOption, Post } from './types';

function normalisePollOptions(raw: any[]): PollOption[] {
  return (raw ?? []).map(opt => ({
    id:         opt.id,
    optionText: opt.option_text ?? opt.optionText ?? '',
    voteCount:  Number(opt.vote_count ?? opt.voteCount ?? 0),
    sortOrder:  opt.sort_order  ?? opt.sortOrder  ?? 0,
  }));
}

/** Normalise a raw API post (snake_case) into the app's Post type. */
function normalisePost(raw: any): Post {
  return {
    id:              raw.id,
    body:            raw.body ?? '',
    postType:        raw.post_type ?? raw.postType ?? 'text',
    imageUrl:        raw.image_url ?? raw.imageUrl ?? null,
    videoUrl:        raw.video_url ?? raw.videoUrl ?? null,
    poll:            normalisePollOptions(raw.poll_options ?? raw.poll ?? []),
    userVoteOptionId: raw.user_vote_option_id ?? raw.userVoteOptionId ?? null,
    createdAt:       raw.created_at ?? raw.createdAt ?? '',
    kudosCount:      Number(raw.kudos_count ?? raw.kudosCount ?? 0),
    kudoed:          raw.user_kudoed ?? raw.kudoed ?? false,
    author: {
      id:        raw.author?.id ?? '',
      fullName:  raw.author?.full_name  ?? raw.author?.fullName  ?? '',
      headline:  raw.author?.headline   ?? undefined,
      avatarUrl: raw.author?.avatar_url ?? raw.author?.avatarUrl ?? undefined,
    },
  };
}

export const PostsApi = {
  feed: async (page = 1, limit = 20): Promise<Paginated<Post>> => {
    const raw = await api.get<any>('/posts', { query: { page, limit } });
    const items: any[] = raw.items ?? raw.docs ?? raw.data ?? [];
    const total = raw.total ?? raw.totalDocs ?? 0;
    return {
      data:    items.map(normalisePost),
      total,
      page:    raw.page  ?? page,
      limit:   raw.limit ?? limit,
      hasMore: raw.hasMore ?? raw.hasNextPage ?? (page * limit < total),
    };
  },

  create: (body: string) => api.post<Post>('/posts', { body }),

  remove: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/posts/${id}`),

  /** Toggle kudos — returns new kudoed state + count. */
  toggleKudos: (id: string) =>
    api.post<{ kudoed: boolean; kudos_count: number }>(`/posts/${id}/kudos`),

  /** Cast a poll vote. */
  votePoll: (postId: string, optionId: string) =>
    api.post<void>(`/posts/${postId}/poll/vote`, { option_id: optionId }),

  comments: (id: string) =>
    api.get<{ data: Comment[]; total: number }>(`/posts/${id}/comments`),

  addComment: (postId: string, body: string, parentId?: string | null) =>
    api.post<Comment>(`/posts/${postId}/comments`, { body, parentId: parentId ?? null }),
};
