export type ChannelMode = "shorts" | "long" | "hybrid";

export interface ChannelVideoRecord {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  durationSec: number;
  isShort: boolean;
  views: number;
  likes: number;
  comments: number;
  viewsPerDay: number;
  likeRate: number;
  commentRate: number;
  thumbnailUrl: string;
}

export interface ChannelMetrics {
  videoCount: number;
  shortsRatio: number;
  medianViewsPerDay: number;
  avgViewsPerDay: number;
  avgLikeRate: number;
  avgCommentRate: number;
  avgUploadIntervalDays: number;
  avgTitleLength: number;
  velocityCliff: boolean;
  velocityCliffRatio: number;
  topOutlierTitles: string[];
  recentUploadTitles: string[];
}

export interface CommentSample {
  videoId: string;
  videoTitle: string;
  comments: string[];
}

export interface CaptionSnippet {
  videoId: string;
  videoTitle: string;
  lines: { startSec: number; text: string }[];
}

export interface ChannelIntelMeta {
  channelId: string;
  handle: string;
  name: string;
  subs: string;
  subsCount: number;
  description: string;
  detected: ChannelMode;
  letter: string;
  thumbnailUrl: string;
  bannerUrl: string;
}

export interface ChannelIntelBundle {
  queriedInput: string;
  meta: ChannelIntelMeta;
  videos: ChannelVideoRecord[];
  metrics: ChannelMetrics;
  inferredNiche: string;
  inferredAudience: string;
  inferredHookStyle: string;
  inferredEditingStyle: string;
  commentSamples: CommentSample[];
  captionSnippets: CaptionSnippet[];
  fetchedAt: string;
}

export interface ResolvedChannel {
  channelId: string;
  name: string;
  handle: string;
  description: string;
  subsCount: number;
  subsLabel: string;
  uploadsPlaylistId: string;
  thumbnailUrl: string;
  bannerUrl: string;
}
