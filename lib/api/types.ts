// Shared API types — mirror the backend schemas in API_DOCUMENTATION.md

export interface User {
  id: string;
  fullName: string;
  email?: string;
  headline?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  website?: string;
  role?: string;
  postsCount?: number;
  consent?: boolean;
  createdAt?: string;
  updatedAt?: string;
  linkedin?: string;
  whatsapp?: string;
  instagram?: string;
  x?: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  headline?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  website?: string;
  consent?: boolean;
  linkedin?: string;
  whatsapp?: string;
  instagram?: string;
  x?: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export type PostType = 'text' | 'image' | 'video' | 'poll';

export interface PollOption {
  id: string;
  optionText: string;
  voteCount: number;
  sortOrder: number;
}

export interface Post {
  id: string;
  body: string;
  postType: PostType;
  imageUrl?: string | null;
  videoUrl?: string | null;
  poll?: PollOption[];
  userVoteOptionId?: string | null;
  author: User;
  kudosCount: number;
  kudoed: boolean;
  commentsCount?: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  body: string;
  author: User;
  parentId: string | null;
  createdAt: string;
  replies?: Comment[];
}

export interface Playlist {
  id: string;
  playlistName: string;
  playlistId: string;
  playlistUrl?: string | null;
  category: string;
  thumbnailUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  videoCount?: number;
}

export interface Video {
  id: string;
  youtubeVideoId: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  videoUrl: string;
  publishedAt?: string | null;
  duration?: string | null;
  isActive: boolean;
}

export interface AuthResponse {
  accessToken: string;
}

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  averageEngagement: number;
  pendingApprovals: number;
  blockedUsers: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string;
  error?: string;
  details?: Array<{ field: string; constraints: Record<string, string> }>;
}
