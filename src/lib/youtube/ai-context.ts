import { extractHookIntelligence, type HookIntelligence } from "./hooks";
import { pickTopVideo } from "./metrics";
import { buildFullIntelPrompt } from "./prompt";
import { buildChannelDigest } from "./spicy-digest";
import { fetchVideoTranscript, type TranscriptLine } from "./transcript";
import type { ChannelIntelBundle, ChannelVideoRecord } from "./types";

export interface FeatureAiContext {
  intelBlock: string;
  digest: ReturnType<typeof buildChannelDigest>;
  receipts: string[];
  hookIntel: HookIntelligence;
  hasTranscript: boolean;
  transcript: TranscriptLine[] | null;
  referenceVideoId?: string;
  referenceTitle: string;
}

export function buildDataReceipts(
  bundle: ChannelIntelBundle,
  extras?: { hasTranscript?: boolean; topVideoTitle?: string },
): string[] {
  const receipts: string[] = [
    `${bundle.videos.length} uploads ingested via YouTube Data API`,
    `${bundle.commentSamples.length} comment threads sampled (relevance order)`,
    `Velocity math: median ${Math.round(bundle.metrics.medianViewsPerDay).toLocaleString()} views/day`,
  ];
  if (bundle.captionSnippets.length) {
    receipts.push(`${bundle.captionSnippets.length} description timelines parsed for beats`);
  }
  if (extras?.hasTranscript) {
    receipts.push(
      `Auto-captions parsed for "${(extras.topVideoTitle || "").slice(0, 48)}${(extras.topVideoTitle || "").length > 48 ? "…" : ""}"`,
    );
  }
  if (bundle.metrics.velocityCliff) {
    receipts.push("Recent velocity cliff detected vs older uploads");
  }
  return receipts;
}

export async function buildFeatureAiContext(
  bundle: ChannelIntelBundle,
  opts?: {
    mode?: "shorts" | "long";
    referenceVideoId?: string;
    referenceTitle?: string;
    referenceVideo?: ChannelVideoRecord;
  },
): Promise<FeatureAiContext> {
  const hookIntel = extractHookIntelligence(bundle);
  const top =
    opts?.referenceVideo || pickTopVideo(bundle.videos, opts?.mode || "shorts") || undefined;
  const referenceVideoId = opts?.referenceVideoId || top?.id;
  const referenceTitle = opts?.referenceTitle || top?.title || bundle.meta.name;
  const transcript = referenceVideoId ? await fetchVideoTranscript(referenceVideoId) : null;
  const digest = buildChannelDigest(bundle, top);
  const intelBlock = buildFullIntelPrompt(
    bundle,
    opts?.mode,
    hookIntel,
    transcript,
    referenceTitle,
  );
  const receipts = buildDataReceipts(bundle, {
    hasTranscript: Boolean(transcript?.length),
    topVideoTitle: referenceTitle,
  });

  return {
    intelBlock,
    digest,
    receipts,
    hookIntel,
    hasTranscript: Boolean(transcript?.length),
    transcript,
    referenceVideoId,
    referenceTitle,
  };
}

/** Attach digest + receipts to any tool JSON response. */
export function attachIntelProof<T extends Record<string, unknown>>(
  payload: T,
  ctx: FeatureAiContext,
): T & {
  channelDigest: FeatureAiContext["digest"];
  dataReceipts: string[];
  hasTranscript: boolean;
} {
  return {
    ...payload,
    channelDigest: ctx.digest,
    dataReceipts: ctx.receipts,
    hasTranscript: ctx.hasTranscript,
  };
}
