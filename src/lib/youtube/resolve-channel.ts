import { extractChannelQuery, formatCount, normalizeHandle, ytFetch } from "./client";
import type { ResolvedChannel } from "./types";

interface SearchListResponse {
  items?: { id: { channelId: string }; snippet: { title: string; description: string } }[];
}

interface ChannelsListResponse {
  items?: {
    id: string;
    snippet: {
      title: string;
      description: string;
      customUrl?: string;
      thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
    };
    brandingSettings?: {
      image?: { bannerExternalUrl?: string };
    };
    statistics: {
      subscriberCount?: string;
      hiddenSubscriberCount?: boolean;
    };
    contentDetails: {
      relatedPlaylists: { uploads: string };
    };
  }[];
}

export async function resolveChannel(input: string): Promise<ResolvedChannel> {
  const query = extractChannelQuery(input);
  const normalizedQuery = normalizeHandle(query);

  const searchData = await ytFetch<SearchListResponse>("search", {
    part: "snippet",
    type: "channel",
    maxResults: "1",
    q: query,
  });

  const channelItem = searchData.items?.[0];
  if (!channelItem?.id?.channelId) {
    throw new Error("CHANNEL_NOT_FOUND");
  }

  const channelId = channelItem.id.channelId;

  const channelsData = await ytFetch<ChannelsListResponse>("channels", {
    part: "snippet,statistics,contentDetails,brandingSettings",
    id: channelId,
  });

  const channelStats = channelsData.items?.[0];
  if (!channelStats) {
    throw new Error("CHANNEL_NOT_FOUND");
  }

  const returnedCustomUrl = normalizeHandle(channelStats.snippet.customUrl || "");
  const returnedTitle = normalizeHandle(channelStats.snippet.title || "");
  const isExactUrl = returnedCustomUrl.length > 0 && returnedCustomUrl === normalizedQuery;
  const isTitleMatch =
    returnedTitle.length >= 3 &&
    normalizedQuery.length >= 3 &&
    (returnedTitle.includes(normalizedQuery) || normalizedQuery.includes(returnedTitle));

  if (!isExactUrl && !isTitleMatch) {
    throw new Error("CHANNEL_NOT_FOUND");
  }

  const subsCount = parseInt(channelStats.statistics.subscriberCount || "0", 10);
  const handle = channelStats.snippet.customUrl || `@${query}`;

  const thumb =
    channelStats.snippet.thumbnails?.high?.url ||
    channelStats.snippet.thumbnails?.medium?.url ||
    channelStats.snippet.thumbnails?.default?.url ||
    "";

  const bannerUrl = channelStats.brandingSettings?.image?.bannerExternalUrl || "";

  return {
    channelId,
    name: channelStats.snippet.title,
    handle,
    description: channelStats.snippet.description || "",
    subsCount,
    subsLabel: subsCount > 0 ? formatCount(subsCount) : "—",
    uploadsPlaylistId: channelStats.contentDetails.relatedPlaylists.uploads,
    thumbnailUrl: thumb,
    bannerUrl,
  };
}
