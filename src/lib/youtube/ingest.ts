import { parseIsoDuration, ytFetch } from "./client";
import type { ChannelVideoRecord } from "./types";

const UPLOAD_LIMIT = 50;

interface PlaylistItemsResponse {
  items?: { snippet: { resourceId: { videoId: string } } }[];
  nextPageToken?: string;
}

interface VideosListResponse {
  items?: {
    id: string;
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      thumbnails?: { high?: { url: string }; medium?: { url: string } };
    };
    statistics: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
    contentDetails: { duration: string };
  }[];
}

export async function ingestChannelVideos(uploadsPlaylistId: string): Promise<ChannelVideoRecord[]> {
  const videoIds: string[] = [];
  let pageToken: string | undefined;

  while (videoIds.length < UPLOAD_LIMIT) {
    const params: Record<string, string> = {
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: String(Math.min(50, UPLOAD_LIMIT - videoIds.length)),
    };
    if (pageToken) params.pageToken = pageToken;

    const playlistData = await ytFetch<PlaylistItemsResponse>("playlistItems", params);
    for (const item of playlistData.items || []) {
      const id = item.snippet?.resourceId?.videoId;
      if (id) videoIds.push(id);
    }
    pageToken = playlistData.nextPageToken;
    if (!pageToken || videoIds.length >= UPLOAD_LIMIT) break;
  }

  if (videoIds.length === 0) return [];

  const videosData = await ytFetch<VideosListResponse>("videos", {
    part: "snippet,statistics,contentDetails",
    id: videoIds.slice(0, UPLOAD_LIMIT).join(","),
  });

  const now = Date.now();

  return (videosData.items || []).map((item) => {
    const views = parseInt(item.statistics.viewCount || "0", 10);
    const likes = parseInt(item.statistics.likeCount || "0", 10);
    const comments = parseInt(item.statistics.commentCount || "0", 10);
    const durationSec = parseIsoDuration(item.contentDetails.duration || "");
    const publishedAt = item.snippet.publishedAt;
    const publishedMs = new Date(publishedAt).getTime();
    const daysSince = Math.max(1, (now - publishedMs) / (1000 * 60 * 60 * 24));
    const viewsPerDay = views / daysSince;
    const isShort = durationSec > 0 && durationSec <= 60;

    return {
      id: item.id,
      title: item.snippet.title,
      description: (item.snippet.description || "").slice(0, 500),
      publishedAt,
      durationSec,
      isShort,
      views,
      likes,
      comments,
      viewsPerDay,
      likeRate: views > 0 ? likes / views : 0,
      commentRate: views > 0 ? comments / views : 0,
      thumbnailUrl:
        item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || "",
    };
  });
}
