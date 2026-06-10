import type { Insight } from "@/lib/analysis.mock";
import { formatCount } from "./client";
import type { ChannelIntelBundle, ChannelVideoRecord } from "./types";

export interface ObservedHook {
  videoId: string;
  videoTitle: string;
  views: string;
  viewsPerDay: number;
  openingHook: string;
  openingSource: "title" | "description" | "visual_thumbnail" | "title_not_hook";
  hookType: string;
  analysis: string;
  thumbnailUrl?: string;
}

export interface HookIntelligence {
  observed: ObservedHook[];
  hookFormula: string;
  titlePatterns: string[];
  commentTriggers: string[];
  /** True when most uploads use handle-only titles — hooks are visual, not headline text */
  visualFirstChannel: boolean;
}

export function isBrandOnlyTitle(title: string, channelHandle: string): boolean {
  const t = title.trim().toLowerCase().replace(/^@/, "");
  const h = channelHandle.trim().toLowerCase().replace(/^@/, "");
  if (!t) return true;
  if (h && t === h) return true;
  if (/^@?[\w.]{2,30}$/i.test(title.trim())) return true;
  return t.length < 12 && !/\?|\d|!/.test(t);
}

function classifyHookType(title: string, opening: string, visualFirst: boolean): string {
  if (visualFirst) return "Visual-first Short";
  const t = `${title} ${opening}`.toLowerCase();
  if (/\?/.test(t)) return "Curiosity gap";
  if (/\b(i |my |i'm |we |our )\b/.test(t)) return "Personal story";
  if (/\b(\d+|#\d+|top \d|ranked|every|all )\b/.test(t)) return "List / stakes";
  if (/\b(vs|versus|beat|better than|worse)\b/.test(t)) return "Comparison";
  if (/\b(secret|truth|nobody|don't|won't|never|stop)\b/.test(t)) return "Contrarian / tension";
  if (/\b(how to|tutorial|guide|learn)\b/.test(t)) return "Promise / how-to";
  return "Bold claim";
}

function firstSentence(text: string): string {
  const clean = text.replace(/\n+/g, " ").trim();
  const m = clean.match(/^[^.!?]+[.!?]?/);
  return (m?.[0] || clean).slice(0, 220).trim();
}

function descContext(video: ChannelVideoRecord): string {
  const d = (video.description || "").replace(/\n+/g, " ").trim();
  if (!d || d.length < 15) return "";
  const tags = d
    .match(/#[\w]+/g)
    ?.slice(0, 6)
    .join(" ");
  const first = firstSentence(d);
  if (tags && first.length < 40) return `${first} ${tags}`.trim();
  return first.slice(0, 180);
}

function explainHookPerformance(v: ChannelVideoRecord, bundle: ChannelIntelBundle): string {
  const med = bundle.metrics.medianViewsPerDay || 1;
  const ratio = v.viewsPerDay / med;
  let perf = "performed near this channel's typical velocity";
  if (ratio >= 1.8) perf = "outperformed most recent uploads on views/day";
  else if (ratio <= 0.45) perf = "underperformed vs recent uploads";
  return `${perf} (${formatCount(v.views)} total, ~${Math.round(v.viewsPerDay)} views/day vs ~${Math.round(med)} median).`;
}

function analyzeTitlePatterns(videos: ChannelVideoRecord[], handle: string): string[] {
  const patterns: string[] = [];
  const titles = videos.slice(0, 15).map((v) => v.title);
  const brandOnly = titles.filter((t) => isBrandOnlyTitle(t, handle)).length;

  if (brandOnly / Math.max(1, titles.length) >= 0.4) {
    patterns.push(
      `Handle-only titles on ${brandOnly}/${titles.length} uploads — packaging hook is thumbnail + first ~2s, not headline text`,
    );
    return patterns;
  }

  const withQuestion = titles.filter((t) => t.includes("?")).length;
  const withNumber = titles.filter((t) => /\d/.test(t)).length;
  const withYou = titles.filter((t) => /\byou\b/i.test(t)).length;
  const avgLen = titles.reduce((s, t) => s + t.length, 0) / Math.max(1, titles.length);

  if (withQuestion / titles.length > 0.35) {
    patterns.push(
      `Questions in titles (${withQuestion}/${titles.length}) — curiosity-gap packaging`,
    );
  }
  if (withNumber / titles.length > 0.4) {
    patterns.push(`Numbers/lists in titles (${withNumber}/${titles.length})`);
  }
  if (withYou / titles.length > 0.3) {
    patterns.push(`Direct "you" framing (${withYou}/${titles.length})`);
  }
  patterns.push(`Average title length ~${Math.round(avgLen)} characters`);
  return patterns;
}

function extractCommentTriggers(bundle: ChannelIntelBundle): string[] {
  const words: Record<string, number> = {};
  for (const sample of bundle.commentSamples) {
    for (const c of sample.comments) {
      const tokens = c.toLowerCase().match(/\b[a-z]{5,}\b/g) || [];
      for (const w of tokens) {
        if (["video", "channel", "thanks", "please", "love", "great"].includes(w)) continue;
        words[w] = (words[w] || 0) + 1;
      }
    }
  }
  return Object.entries(words)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w, n]) => `"${w}" (${n} mentions in sampled comments)`);
}

function resolveOpeningSignal(
  v: ChannelVideoRecord,
  bundle: ChannelIntelBundle,
  visualFirst: boolean,
): Pick<ObservedHook, "openingHook" | "openingSource"> {
  const handle = bundle.meta.handle || bundle.meta.name;
  const desc = descContext(v);
  const caption = bundle.captionSnippets.find((c) => c.videoId === v.id);
  const descLine = caption?.lines[0]?.text ? firstSentence(caption.lines[0].text) : desc;

  if (visualFirst || isBrandOnlyTitle(v.title, handle)) {
    const extra = descLine ? ` Description/tags: ${descLine.slice(0, 100)}` : "";
    return {
      openingSource: "visual_thumbnail",
      openingHook: `Hook is the first-frame visual + thumbnail (title is just "${v.title}").${extra} Open the Short at 0:00 — we cannot read pixels from the public API.`,
    };
  }

  if (descLine && descLine.length > 25 && descLine.toLowerCase() !== v.title.toLowerCase()) {
    return {
      openingSource: "description",
      openingHook: `Description context (not confirmed on-screen hook): ${descLine}`,
    };
  }

  return {
    openingSource: "title",
    openingHook: `Title line used as packaging hook: "${v.title}"`,
  };
}

export function extractHookIntelligence(bundle: ChannelIntelBundle): HookIntelligence {
  const handle = bundle.meta.handle || bundle.meta.name;
  const topVideos = [...bundle.videos].sort((a, b) => b.views - a.views).slice(0, 5);
  const brandRatio =
    bundle.videos.slice(0, 20).filter((v) => isBrandOnlyTitle(v.title, handle)).length /
    Math.max(1, Math.min(20, bundle.videos.length));
  const visualFirstChannel = brandRatio >= 0.4;

  const observed: ObservedHook[] = topVideos.map((v) => {
    const { openingHook, openingSource } = resolveOpeningSignal(v, bundle, visualFirstChannel);
    return {
      videoId: v.id,
      videoTitle: v.title,
      views: formatCount(v.views),
      viewsPerDay: Math.round(v.viewsPerDay),
      openingHook,
      openingSource,
      thumbnailUrl: v.thumbnailUrl,
      hookType: classifyHookType(v.title, openingHook, visualFirstChannel),
      analysis: explainHookPerformance(v, bundle),
    };
  });

  const titlePatterns = analyzeTitlePatterns(bundle.videos, handle);
  const hookFormula = visualFirstChannel
    ? `${titlePatterns[0] || "Visual-first channel"}. Reverse-engineer hooks by scrubbing 0:00–0:03 in the reference embed and matching their thumbnail frame — not by copying title text.`
    : `When titles are descriptive, opening lines in titles/descriptions can signal packaging. ${titlePatterns.slice(0, 2).join("; ")}. On-screen hook still requires watching the first seconds.`;

  return {
    observed,
    hookFormula,
    titlePatterns,
    commentTriggers: extractCommentTriggers(bundle),
    visualFirstChannel,
  };
}

export function buildMetricFallbackInsights(bundle: ChannelIntelBundle): {
  patterns: Insight[];
  weaknesses: Insight[];
  opportunities: Insight[];
} {
  const m = bundle.metrics;
  const top = [...bundle.videos].sort((a, b) => b.viewsPerDay - a.viewsPerDay)[0];
  const weak = [...bundle.videos].sort((a, b) => a.viewsPerDay - b.viewsPerDay)[0];

  const patterns: Insight[] = [
    {
      label: `${bundle.videos.length} public uploads analyzed`,
      detail: `Median ${Math.round(m.medianViewsPerDay)} views/day · avg ${Math.round(m.avgViewsPerDay)} · ${Math.round(m.shortsRatio * 100)}% shorts in sample.`,
    },
    {
      label: "Niche signal",
      detail: bundle.inferredNiche,
    },
    {
      label: "Audience signal",
      detail: bundle.inferredAudience,
    },
  ];
  if (top) {
    patterns.push({
      label: `Top velocity: "${top.title.slice(0, 60)}${top.title.length > 60 ? "…" : ""}"`,
      detail: `${formatCount(top.views)} views (~${Math.round(top.viewsPerDay)} views/day).`,
    });
  }

  const weaknesses: Insight[] = [];
  if (m.velocityCliff) {
    weaknesses.push({
      label: "Velocity cliff detected",
      detail: `Recent uploads average ~${Math.round(m.velocityCliffRatio * 100)}% of older median views/day — hook or packaging may not be landing.`,
    });
  }
  if (weak && top && weak.id !== top.id) {
    weaknesses.push({
      label: `Underperformer: "${weak.title.slice(0, 55)}…"`,
      detail: `Only ~${Math.round(weak.viewsPerDay)} views/day vs channel median ~${Math.round(m.medianViewsPerDay)}.`,
    });
  }

  const opportunities: Insight[] = m.topOutlierTitles.slice(0, 2).map((title) => ({
    label: "Outlier to study",
    detail: `"${title}" — compare thumbnail + first 2s in the player (titles may not describe the hook).`,
  }));

  return { patterns, weaknesses, opportunities };
}

export function buildHookPromptBlock(hookIntel: HookIntelligence): string {
  return `
HOOK_INTELLIGENCE (public API only — do NOT claim title text is the on-screen hook when visualFirstChannel is true):
${JSON.stringify(hookIntel, null, 2)}

Rules:
- When visualFirstChannel: hooks are thumbnail + first-frame visual; never invent "fluid pouring" etc. without transcript.
- "observedHooks": use observed array; openingHook is packaging context, not a watched hook unless openingSource is "title" with a descriptive title.
- "hookFormula": explain whether hooks are title-driven or visual-first for this channel.
`.trim();
}
