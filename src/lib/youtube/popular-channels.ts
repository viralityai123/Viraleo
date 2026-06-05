import { getYoutubeApiKey } from "./client";
import { resolveChannel } from "./resolve-channel";

export interface PopularChannel {
  name: string;
  query: string;
  thumbnailUrl: string;
  handle: string;
}

export const POPULAR_CHANNEL_QUERIES: { name: string; query: string }[] = [
  { name: "MrBeast", query: "@MrBeast" },
  { name: "DrDonut", query: "@DrDonut" },
  { name: "Caylus", query: "@Caylus" },
  { name: "Foltyn", query: "@Foltyn" },
];

/** Resolve real YouTube channel avatars for landing chips. */
export async function fetchPopularChannels(): Promise<PopularChannel[]> {
  if (!getYoutubeApiKey()) {
    return POPULAR_CHANNEL_QUERIES.map((c) => ({
      ...c,
      thumbnailUrl: "",
      handle: c.query,
    }));
  }

  const out: PopularChannel[] = [];
  for (const ch of POPULAR_CHANNEL_QUERIES) {
    try {
      const resolved = await resolveChannel(ch.query);
      out.push({
        name: ch.name,
        query: resolved.handle.startsWith("@") ? resolved.handle : `@${resolved.handle}`,
        thumbnailUrl: resolved.thumbnailUrl,
        handle: resolved.handle,
      });
    } catch {
      out.push({
        name: ch.name,
        query: ch.query,
        thumbnailUrl: "",
        handle: ch.query,
      });
    }
  }
  return out;
}
