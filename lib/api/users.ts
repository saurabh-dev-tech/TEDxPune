import { api } from './client';
import type { Paginated, UpdateUserPayload, User } from './types';

/** Normalise raw API user (snake_case) → app User type (camelCase). */
function normaliseUser(raw: any): User {
  return {
    id:         raw.id ?? '',
    fullName:   raw.full_name   ?? raw.fullName   ?? '',
    email:      raw.email       ?? undefined,
    headline:   raw.headline    ?? undefined,
    bio:        raw.bio         ?? raw.about       ?? undefined,
    avatarUrl:  raw.avatar_url  ?? raw.avatarUrl   ?? undefined,
    location:   raw.location    ?? undefined,
    website:    raw.website     ?? undefined,
    role:       raw.role        ?? undefined,
    postsCount: raw.posts_count ?? raw.postsCount  ?? undefined,
    createdAt:  raw.created_at  ?? raw.createdAt   ?? undefined,
    updatedAt:  raw.updated_at  ?? raw.updatedAt   ?? undefined,
    linkedin:   raw.linkedin    ?? undefined,
    whatsapp:   raw.whatsapp    ?? undefined,
    instagram:  raw.instagram   ?? undefined,
    x:          raw.x           ?? undefined,
  };
}

export const UsersApi = {
  me: async (): Promise<User> => {
    const raw = await api.get<any>('/users/me');
    return normaliseUser(raw);
  },

  updateMe: async (payload: UpdateUserPayload): Promise<User> => {
    // API expects snake_case keys — convert before sending
    const body: Record<string, any> = {};
    if (payload.fullName  !== undefined) body.full_name  = payload.fullName;
    if (payload.headline  !== undefined) body.headline   = payload.headline;
    if (payload.bio       !== undefined) body.bio        = payload.bio;
    if (payload.avatarUrl !== undefined) body.avatar_url = payload.avatarUrl;
    if (payload.location  !== undefined) body.location   = payload.location;
    if (payload.website   !== undefined) body.website    = payload.website;
    if (payload.linkedin  !== undefined) body.linkedin   = payload.linkedin;
    if (payload.whatsapp  !== undefined) body.whatsapp   = payload.whatsapp;
    if (payload.instagram !== undefined) body.instagram  = payload.instagram;
    if (payload.x         !== undefined) body.x          = payload.x;

    const raw = await api.patch<any>('/users/me', body);
    return normaliseUser(raw);
  },

  directory: async (page = 1, limit = 20): Promise<Paginated<User>> => {
    const raw = await api.get<any>('/users/directory', { query: { page, limit } });
    const items: any[] = raw.items ?? raw.docs ?? raw.data ?? [];
    const total = raw.total ?? raw.totalDocs ?? 0;
    return {
      data:    items.map(normaliseUser),
      total,
      page:    raw.page  ?? page,
      limit:   raw.limit ?? limit,
      hasMore: raw.hasMore ?? raw.hasNextPage ?? (page * limit < total),
    };
  },

  byId: async (id: string): Promise<User> => {
    const raw = await api.get<any>(`/users/${id}`);
    return normaliseUser(raw);
  },
};
