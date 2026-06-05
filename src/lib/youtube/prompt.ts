import { formatCount } from "./client";
import type { HookIntelligence } from "./hooks";
import { buildHookPromptBlock } from "./hooks";
import type { ChannelIntelBundle, ChannelVideoRecord } from "./types";
import { pickTopVideo } from "./metrics";
import { buildTranscriptPromptBlock, type TranscriptLine } from "./transcript";

export function buildIntelPromptBlock(
  bundle: ChannelIntelBundle,
  mode?: "shorts" | "long"
): string {
  const topVideo = mode ? pickTopVideo(bundle.videos, mode) : pickTopVideo(bundle.videos, "shorts");
  const m = bundle.metrics;

  const videoTable = bundle.videos
    .slice(0, 15)
    .map(
      (v) =>
        `- "${v.title}" | ${formatCount(v.views)} views | ${v.viewsPerDay.toFixed(0)} views/day | ${v.durationSec}s | likes ${(v.likeRate * 100).toFixed(2)}% | comments ${(v.commentRate * 100).toFixed(2)}% | published ${v.publishedAt.slice(0, 10)}`
    )
    .join("\n");

  const commentBlock = bundle.commentSamples
    .map(
      (s) =>
        `Video "${s.videoTitle}" top comments:\n${s.comments.slice(0, 8).map((c) => `  • ${c.slice(0, 120)}`).join("\n")}`
    )
    .join("\n\n");

  const captionBlock = bundle.captionSnippets
    .map(
      (s) =>
        `Video "${s.videoTitle}" description/caption timeline:\n${s.lines.map((l) => `  [${l.startSec}s] ${l.text}`).join("\n")}`
    )
    .join("\n\n");

  return `
=== PUBLIC_CHANNEL_INTELLIGENCE (verified YouTube Data API — no Studio analytics) ===
Channel: "${bundle.meta.name}" (${bundle.meta.handle})
Subscribers: ${bundle.meta.subs} (${bundle.meta.subsCount.toLocaleString()})
Description excerpt: "${bundle.meta.description.slice(0, 400)}"
Detected format mix: ${bundle.meta.detected}
Inferred niche: ${bundle.inferredNiche}
Inferred audience (from public signals): ${bundle.inferredAudience}
Typical hook style: ${bundle.inferredHookStyle}
Typical editing style: ${bundle.inferredEditingStyle}

PUBLIC_METRICS:
${JSON.stringify(m, null, 2)}

RECENT_UPLOADS (newest 15 in sample):
${videoTable}

${commentBlock ? `COMMENT_SAMPLES:\n${commentBlock}\n` : ""}
${captionBlock ? `DESCRIPTION_TIMELINE:\n${captionBlock}\n` : ""}

${topVideo ? `TOP_VIDEO_FOR_MODE: "${topVideo.title}" (id: ${topVideo.id}, ${formatCount(topVideo.views)} views, ${topVideo.durationSec}s, ${topVideo.viewsPerDay.toFixed(0)} views/day)` : ""}

STRICT_RULES:
- Cite real video titles and plain-English metrics (e.g. "42% of recent uploads are Shorts") — NEVER echo raw JSON keys like shortsRatio, PUBLIC_METRICS, medianViewsPerDay.
- Audience is INFERRED — include kids on parents' accounts for gaming/family channels; never fake 18–24 / 25–34 percentage bars.
- Do NOT invent retention percentages (e.g. "+18%") — we do not have retention curves.
- Do NOT output cuts per minute — not measurable from public API.
- topVideo moments timestamps must be 0..duration and prefer DESCRIPTION_TIMELINE startSec when available.
- Use HOOK_INTELLIGENCE block when provided — never output generic "ready to ship" template hooks.
=== END PUBLIC_CHANNEL_INTELLIGENCE ===
`.trim();
}

export function buildFullIntelPrompt(
  bundle: ChannelIntelBundle,
  mode?: "shorts" | "long",
  hookIntel?: HookIntelligence,
  transcript?: TranscriptLine[] | null,
  refTitle?: string
): string {
  const blocks = [buildIntelPromptBlock(bundle, mode)];
  if (hookIntel) blocks.push(buildHookPromptBlock(hookIntel));
  if (refTitle) blocks.push(buildTranscriptPromptBlock(transcript ?? null, refTitle));
  return blocks.join("\n\n");
}

export function buildPrefillContext(bundle: ChannelIntelBundle) {
  return {
    channelNiche: bundle.inferredNiche,
    targetAudience: bundle.inferredAudience,
    hookType: bundle.inferredHookStyle,
    editingStyle: bundle.inferredEditingStyle,
    channelName: bundle.meta.name,
    channelHandle: bundle.meta.handle,
    topVideoTitle: pickTopVideo(bundle.videos, "shorts")?.title || bundle.videos[0]?.title || "",
    topVideoUrl: bundle.videos[0]
      ? `https://www.youtube.com/watch?v=${bundle.videos.sort((a, b) => b.views - a.views)[0].id}`
      : "",
  };
}
