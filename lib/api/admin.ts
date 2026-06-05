import { api } from './client';
import type { AdminMetrics, User } from './types';

export const AdminApi = {
  metrics: () => api.get<AdminMetrics>('/admin/metrics'),

  pendingUsers: () =>
    api.get<{ data: User[]; total: number }>('/admin/users/pending'),

  approveUser: (id: string) =>
    api.patch<User>(`/admin/users/${id}/approve`),

  blockUser: (id: string) =>
    api.patch<User>(`/admin/users/${id}/block`),

  deletePost: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/admin/posts/${id}`),
};
