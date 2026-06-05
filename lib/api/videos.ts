import { api } from './client';
import type { Playlist, Video } from './types';

function normalisePlaylist(raw: any): Playlist {
  return {
    id:           raw.id ?? '',
    playlistName: raw.playlist_name  ?? raw.playlistName  ?? '',
    playlistId:   raw.playlist_id    ?? raw.playlistId    ?? '',
    playlistUrl:  raw.playlist_url   ?? raw.playlistUrl   ?? null,
    category:     raw.category       ?? 'General',
    thumbnailUrl: raw.thumbnail_url  ?? raw.thumbnailUrl  ?? null,
    displayOrder: raw.display_order  ?? raw.displayOrder  ?? 0,
    isActive:     raw.is_active      ?? raw.isActive      ?? true,
    videoCount:   raw.video_count    ?? raw.videoCount    ?? 0,
  };
}

function normaliseVideo(raw: any): Video {
  return {
    id:             raw.id ?? '',
    youtubeVideoId: raw.youtube_video_id ?? raw.youtubeVideoId ?? '',
    title:          raw.title       ?? 'Untitled',
    description:    raw.description ?? null,
    thumbnailUrl:   raw.thumbnail_url ?? raw.thumbnailUrl ?? null,
    videoUrl:       raw.video_url   ?? raw.videoUrl   ?? '',
    publishedAt:    raw.published_at ?? raw.publishedAt ?? null,
    duration:       raw.duration    ?? null,
    isActive:       raw.is_active   ?? raw.isActive   ?? true,
  };
}

export const VideosApi = {
  listPlaylists: async (): Promise<Playlist[]> => {
    const raw = await api.get<any>('/videos/playlists');
    const items: any[] = Array.isArray(raw) ? raw : (raw.items ?? raw.playlists ?? raw.data ?? []);
    return items.map(normalisePlaylist);
  },

  listVideos: async (playlistId: string, page = 1, limit = 20): Promise<{ data: Video[]; total: number }> => {
    const raw = await api.get<any>(`/videos/playlists/${playlistId}/videos`, { query: { page, limit } });
    const items: any[] = Array.isArray(raw) ? raw : (raw.items ?? raw.videos ?? raw.data ?? []);
    return {
      data:  items.map(normaliseVideo),
      total: raw.total ?? raw.totalCount ?? items.length,
    };
  },
};
