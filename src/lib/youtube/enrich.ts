import { ytFetch } from "./client";
import type { CaptionSnippet, ChannelVideoRecord, CommentSample } from "./types";

interface CommentThreadsResponse {
  items?: {
    snippet: {
      topLevelComment: { snippet: { textDisplay: string } };
    };
  }[];
}

export async function fetchCommentSamples(
  topVideos: ChannelVideoRecord[],
  limit = 3,
): Promise<CommentSample[]> {
  const samples: CommentSample[] = [];

  for (const video of topVideos.slice(0, limit)) {
    try {
      const data = await ytFetch<CommentThreadsResponse>("commentThreads", {
        part: "snippet",
        videoId: video.id,
        maxResults: "20",
        order: "relevance",
        textFormat: "plainText",
      });

      const comments = (data.items || [])
        .map((item) => item.snippet?.topLevelComment?.snippet?.textDisplay || "")
        .filter((t) => t.length > 0)
        .slice(0, 15);

      if (comments.length > 0) {
        samples.push({
          videoId: video.id,
          videoTitle: video.title,
          comments,
        });
      }
    } catch (e) {
      console.warn(`Comments fetch failed for ${video.id}:`, e);
    }
  }

  return samples;
}

/** Build pseudo timeline from description sentences when official captions require OAuth. */
export function buildDescriptionSnippets(
  topVideos: ChannelVideoRecord[],
  limit = 2,
): CaptionSnippet[] {
  const snippets: CaptionSnippet[] = [];

  for (const video of topVideos.slice(0, limit)) {
    const text = (video.description || "").replace(/\n+/g, " ").trim();
    if (text.length < 40) continue;

    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.length > 10)
      .slice(0, 8);
    const lines = sentences.map((text, i) => ({
      startSec: i * (video.isShort ? 8 : 25),
      text: text.slice(0, 200),
    }));

    if (lines.length > 0) {
      snippets.push({
        videoId: video.id,
        videoTitle: video.title,
        lines,
      });
    }
  }

  return snippets;
}
