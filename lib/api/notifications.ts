import { api } from './client';

export interface AppNotification {
  id: string;
  type: 'announcement' | 'kudos' | 'comment' | 'talk' | 'system';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  avatarUrl?: string;
  authorName?: string;
  postId?: string;
}

export const NotificationsApi = {
  list: async (): Promise<AppNotification[]> => {
    try {
      const raw = await api.get<any>('/notifications');
      const items: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.notifications)
        ? raw.notifications
        : [];

      return items.map((item: any) => {
        const postId = item.postId ?? item.post_id ?? item.data?.postId ?? item.data?.post_id;
        return {
          id: String(item.id ?? Math.random()),
          type: item.type ?? 'announcement',
          title: item.title ?? (item.type === 'announcement' ? 'New Announcement' : 'Notification'),
          body: item.body ?? item.message ?? item.content ?? '',
          read: Boolean(item.read ?? item.is_read ?? false),
          createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
          actionUrl: item.actionUrl ?? item.action_url ?? (postId ? `/post/${postId}` : undefined),
          avatarUrl: item.avatarUrl ?? item.avatar_url,
          authorName: item.authorName ?? item.author_name,
          postId: postId ? String(postId) : undefined,
        };
      });
    } catch (err) {
      console.warn('[NotificationsApi] Error fetching notifications:', err);
      return [];
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.warn(`[NotificationsApi] Could not mark notification ${id} as read:`, err);
    }
  },

  markAllAsRead: async (): Promise<void> => {
    try {
      await api.post('/notifications/read-all');
    } catch (err) {
      console.warn('[NotificationsApi] Could not mark all notifications as read:', err);
    }
  },
};
