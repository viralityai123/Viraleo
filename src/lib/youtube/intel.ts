import { formatCount, getYoutubeApiKey, ytFetch } from "./client";
import { ingestChannelVideos } from "./ingest";
import {
  computeChannelMetrics,
  detectModeFromVideos,
  inferAudienceFromMetrics,
  inferEditingStyle,
  inferHookStyle,
  inferNicheFromVideos,
} from "./metrics";
import { buildDescriptionSnippets, fetchCommentSamples } from "./enrich";
import { resolveChannel } from "./resolve-channel";
import type { ChannelIntelBundle } from "./types";

export async function fetchChannelIntel(input: string): Promise<ChannelIntelBundle> {
  if (!getYoutubeApiKey()) {
    throw new Error("YOUTUBE_API_KEY_REQUIRED");
  }

  const resolved = await resolveChannel(input);
  const videos = await ingestChannelVideos(resolved.uploadsPlaylistId);
  const metrics = computeChannelMetrics(videos);
  const detected = detectModeFromVideos(videos);

  const topByViews = [...videos].sort((a, b) => b.views - a.views);
  const commentSamples = await fetchCommentSamples(topByViews, 3);
  const captionSnippets = buildDescriptionSnippets(topByViews, 2);

  const inferredNiche = inferNicheFromVideos(videos, resolved.description);
  const inferredAudience = inferAudienceFromMetrics(metrics, inferredNiche, commentSamples);
  const inferredHookStyle = inferHookStyle(videos);
  const inferredEditingStyle = inferEditingStyle(metrics, videos);

  return {
    queriedInput: input.trim(),
    meta: {
      channelId: resolved.channelId,
      handle: resolved.handle,
      name: resolved.name,
      subs: resolved.subsLabel,
      subsCount: resolved.subsCount,
      description: resolved.description,
      detected,
      letter: resolved.name.charAt(0).toUpperCase(),
      thumbnailUrl: resolved.thumbnailUrl,
      bannerUrl: resolved.bannerUrl,
    },
    videos,
    metrics,
    inferredNiche,
    inferredAudience,
    inferredHookStyle,
    inferredEditingStyle,
    commentSamples,
    captionSnippets,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchChannelIntelByChannelId(
  channelId: string,
  fallbackInput?: string,
): Promise<ChannelIntelBundle> {
  if (!getYoutubeApiKey()) {
    throw new Error("YOUTUBE_API_KEY_REQUIRED");
  }

  interface ChannelsListResponse {
    items?: {
      id: string;
      snippet: {
        title: string;
        description: string;
        customUrl?: string;
        thumbnails?: {
          high?: { url: string };
          medium?: { url: string };
          default?: { url: string };
        };
      };
      brandingSettings?: { image?: { bannerExternalUrl?: string } };
      statistics: { subscriberCount?: string };
      contentDetails: { relatedPlaylists: { uploads: string } };
    }[];
  }

  const channelsData = await ytFetch<ChannelsListResponse>("channels", {
    part: "snippet,statistics,contentDetails,brandingSettings",
    id: channelId,
  });

  const ch = channelsData.items?.[0];
  if (!ch) throw new Error("CHANNEL_NOT_FOUND");

  const subsCount = parseInt(ch.statistics.subscriberCount || "0", 10);
  const input = fallbackInput || ch.snippet.customUrl || ch.snippet.title;
  const videos = await ingestChannelVideos(ch.contentDetails.relatedPlaylists.uploads);
  const metrics = computeChannelMetrics(videos);
  const detected = detectModeFromVideos(videos);
  const topByViews = [...videos].sort((a, b) => b.views - a.views);
  const commentSamples = await fetchCommentSamples(topByViews, 3);
  const captionSnippets = buildDescriptionSnippets(topByViews, 2);
  const inferredNiche = inferNicheFromVideos(videos, ch.snippet.description || "");
  const inferredAudience = inferAudienceFromMetrics(metrics, inferredNiche, commentSamples);

  return {
    queriedInput: input,
    meta: {
      channelId: ch.id,
      handle: ch.snippet.customUrl || `@${ch.snippet.title}`,
      name: ch.snippet.title,
      subs: subsCount > 0 ? formatCount(subsCount) : "—",
      subsCount,
      description: ch.snippet.description || "",
      detected,
      letter: ch.snippet.title.charAt(0).toUpperCase(),
      thumbnailUrl:
        ch.snippet.thumbnails?.high?.url ||
        ch.snippet.thumbnails?.medium?.url ||
        ch.snippet.thumbnails?.default?.url ||
        "",
      bannerUrl: ch.brandingSettings?.image?.bannerExternalUrl || "",
    },
    videos,
    metrics,
    inferredNiche,
    inferredAudience,
    inferredHookStyle: inferHookStyle(videos),
    inferredEditingStyle: inferEditingStyle(metrics, videos),
    commentSamples,
    captionSnippets,
    fetchedAt: new Date().toISOString(),
  };
}
