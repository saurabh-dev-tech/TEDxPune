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
    commentsCount:   Number(raw.comments_count ?? raw.commentsCount ?? 0),
    author: {
      id:        raw.author?.id ?? '',
      fullName:  raw.author?.full_name  ?? raw.author?.fullName  ?? '',
      headline:  raw.author?.headline   ?? undefined,
      avatarUrl: raw.author?.avatar_url ?? raw.author?.avatarUrl ?? undefined,
    },
  };
}

function normaliseComment(raw: any): Comment {
  return {
    id:        raw.id,
    body:      raw.body ?? '',
    parentId:  raw.parent_id ?? raw.parentId ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? '',
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
    if (items.length > 0) {
      console.log("=== RAW POST ITEM DEBUG ===");
      console.log(JSON.stringify(items[0], null, 2));
    }
    const total = raw.total ?? raw.totalDocs ?? 0;
    return {
      data:    items.map(normalisePost),
      total,
      page:    raw.page  ?? page,
      limit:   raw.limit ?? limit,
      hasMore: raw.hasMore ?? raw.hasNextPage ?? (page * limit < total),
    };
  },

  get: async (id: string): Promise<Post> => {
    const raw = await api.get<any>(`/posts/${id}`);
    return normalisePost(raw.data ?? raw);
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

  comments: async (id: string): Promise<{ data: Comment[]; total: number }> => {
    const raw = await api.get<any>(`/posts/${id}/comments`);
    const items: any[] = raw.items ?? raw.data ?? raw ?? [];
    const total = raw.total ?? items.length;
    return {
      data: items.map(normaliseComment),
      total,
    };
  },

  addComment: async (postId: string, body: string, parentId?: string | null): Promise<Comment> => {
    const data: Record<string, any> = { body };
    if (parentId) {
      data.parentId = parentId;
    }
    const raw = await api.post<any>(`/posts/${postId}/comments`, data);
    return normaliseComment(raw.data ?? raw);
  },
};
