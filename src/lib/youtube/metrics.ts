import type { ChannelMetrics, ChannelMode, ChannelVideoRecord } from "./types";

export function detectModeFromVideos(videos: ChannelVideoRecord[]): ChannelMode {
  if (videos.length === 0) return "hybrid";
  const shorts = videos.filter((v) => v.isShort).length;
  const ratio = shorts / videos.length;
  if (ratio >= 0.65) return "shorts";
  if (ratio <= 0.2) return "long";
  return "hybrid";
}

export function computeChannelMetrics(videos: ChannelVideoRecord[]): ChannelMetrics {
  if (videos.length === 0) {
    return {
      videoCount: 0,
      shortsRatio: 0,
      medianViewsPerDay: 0,
      avgViewsPerDay: 0,
      avgLikeRate: 0,
      avgCommentRate: 0,
      avgUploadIntervalDays: 0,
      avgTitleLength: 0,
      velocityCliff: false,
      velocityCliffRatio: 1,
      topOutlierTitles: [],
      recentUploadTitles: [],
    };
  }

  const sortedByDate = [...videos].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  const viewsPerDay = videos.map((v) => v.viewsPerDay).sort((a, b) => a - b);
  const mid = Math.floor(viewsPerDay.length / 2);
  const medianViewsPerDay =
    viewsPerDay.length % 2 === 0
      ? (viewsPerDay[mid - 1] + viewsPerDay[mid]) / 2
      : viewsPerDay[mid];

  const recent5 = sortedByDate.slice(0, 5);
  const prior5 = sortedByDate.slice(5, 10);
  const recentAvg =
    recent5.reduce((s, v) => s + v.viewsPerDay, 0) / Math.max(1, recent5.length);
  const priorAvg =
    prior5.length > 0
      ? prior5.reduce((s, v) => s + v.viewsPerDay, 0) / prior5.length
      : recentAvg;
  const velocityCliffRatio = priorAvg > 0 ? recentAvg / priorAvg : 1;
  const velocityCliff = prior5.length >= 3 && velocityCliffRatio < 0.45;

  const intervals: number[] = [];
  for (let i = 0; i < sortedByDate.length - 1; i++) {
    const d =
      (new Date(sortedByDate[i].publishedAt).getTime() -
        new Date(sortedByDate[i + 1].publishedAt).getTime()) /
      (1000 * 60 * 60 * 24);
    intervals.push(d);
  }

  const topByViews = [...videos].sort((a, b) => b.views - a.views).slice(0, 3);

  return {
    videoCount: videos.length,
    shortsRatio: videos.filter((v) => v.isShort).length / videos.length,
    medianViewsPerDay,
    avgViewsPerDay: videos.reduce((s, v) => s + v.viewsPerDay, 0) / videos.length,
    avgLikeRate: videos.reduce((s, v) => s + v.likeRate, 0) / videos.length,
    avgCommentRate: videos.reduce((s, v) => s + v.commentRate, 0) / videos.length,
    avgUploadIntervalDays:
      intervals.length > 0 ? intervals.reduce((s, d) => s + d, 0) / intervals.length : 0,
    avgTitleLength: videos.reduce((s, v) => s + v.title.length, 0) / videos.length,
    velocityCliff,
    velocityCliffRatio,
    topOutlierTitles: topByViews.map((v) => v.title),
    recentUploadTitles: sortedByDate.slice(0, 8).map((v) => v.title),
  };
}

export function inferNicheFromVideos(videos: ChannelVideoRecord[], channelDescription: string): string {
  const titles = videos
    .slice(0, 8)
    .map((v) => v.title)
    .join(" ");
  const desc = channelDescription.slice(0, 300);
  const combined = `${titles} ${desc}`.toLowerCase();
  const keywords: [string, string][] = [
    ["gaming", "Gaming"],
    ["minecraft", "Gaming / Minecraft"],
    ["finance", "Finance & Money"],
    ["crypto", "Crypto & Investing"],
    ["tech", "Technology"],
    ["review", "Tech Reviews"],
    ["fitness", "Fitness & Health"],
    ["workout", "Fitness & Health"],
    ["cooking", "Food & Cooking"],
    ["recipe", "Food & Cooking"],
    ["education", "Education"],
    ["tutorial", "How-to / Tutorials"],
    ["vlog", "Lifestyle / Vlog"],
    ["comedy", "Comedy & Entertainment"],
    ["music", "Music"],
    ["beauty", "Beauty & Fashion"],
    ["podcast", "Podcast / Talk"],
    ["news", "News & Commentary"],
    ["science", "Science & Education"],
    ["asmr", "ASMR & Relaxation"],
  ];
  for (const [needle, label] of keywords) {
    if (combined.includes(needle)) return label;
  }
  if (videos.length > 0) {
    const top = [...videos].sort((a, b) => b.views - a.views)[0];
    return `Content similar to: "${top.title.slice(0, 60)}"`;
  }
  return "General YouTube";
}

export function inferAudienceFromMetrics(
  metrics: ChannelMetrics,
  niche: string,
  commentSamples: { comments: string[] }[]
): string {
  const allComments = commentSamples.flatMap((c) => c.comments).join(" ").toLowerCase();
  const hints: string[] = [];
  if (metrics.shortsRatio > 0.5) hints.push("mobile-first Shorts viewers");
  if (metrics.avgCommentRate > 0.02) hints.push("highly engaged commenters");
  if (metrics.avgLikeRate > 0.04) hints.push("strong like engagement");
  if (allComments.match(/\b(gen z|teen|school|homework)\b/)) hints.push("younger skew");
  if (allComments.match(/\b(parent|kids|baby|toddler|mom|dad)\b/)) hints.push("parents / family co-viewing");
  if (allComments.match(/\b(invest|stock|money|salary)\b/)) hints.push("money-motivated adults");
  if (allComments.match(/\b(minecraft|roblox|fortnite|mod|server|skin)\b/)) hints.push("gaming / kid-skewing fandom");
  if (allComments.match(/\b(homework|school|teacher|class)\b/)) hints.push("students");

  const hintStr = hints.length > 0 ? hints.join(", ") : "general YouTube feed browsers";
  return `Inferred audience for ${niche}: ${hintStr}. Based on public engagement patterns only — not YouTube Studio demographics.`;
}

export interface AudienceSketchSegment {
  label: string;
  note: string;
}

export interface AudienceSketch {
  summary: string;
  segments: AudienceSketchSegment[];
  disclaimer: string;
}

/** Qualitative audience sketch — never fake Studio age percentages. */
export function inferAudienceSketch(
  niche: string,
  metrics: ChannelMetrics,
  commentSamples: { comments: string[] }[]
): AudienceSketch {
  const combined = `${niche} ${commentSamples.flatMap((c) => c.comments).join(" ")}`.toLowerCase();
  const disclaimer =
    "YouTube does not expose exact age splits on the public API. This sketch is inferred from content category and comment language — including kids watching on a parent's account.";

  const isKidsGaming =
    /\b(minecraft|roblox|fortnite|lego|pokemon|cartoon|kids|nursery|peppa|cocomelon)\b/.test(combined);
  const isFamily =
    /\b(parent|family|kids|toddler|baby|children)\b/.test(combined) || isKidsGaming;

  if (isKidsGaming || (isFamily && metrics.shortsRatio < 0.35)) {
    return {
      summary:
        "Family & kid-skewing viewership — includes co-viewing on parents' YouTube accounts (not just 18–34 professionals).",
      segments: [
        { label: "Kids (primary viewer)", note: "Often mobile/TV; high replay on challenge & story videos" },
        { label: "Parents / guardians", note: "Account holders who search, subscribe, and gate what plays next" },
        { label: "Teen superfans", note: "Comment-heavy segment that amplifies inside jokes & memes" },
        { label: "Casual feed browsers", note: "Click from recommendations without subscribing" },
      ],
      disclaimer,
    };
  }

  if (metrics.shortsRatio > 0.55) {
    return {
      summary: "Mobile-first Shorts scrollers — snackable, high-swipe feeds.",
      segments: [
        { label: "Gen Z / young teens", note: "Fast hook tolerance; meme-native comments" },
        { label: "Young adults (18–34)", note: "Largest share on many Shorts niches — not guaranteed for every channel" },
        { label: "Binge replays", note: "Loop-friendly formats drive rewatches" },
      ],
      disclaimer,
    };
  }

  return {
    summary: "Mixed-age YouTube browse audience shaped by topic and thumbnail promise.",
    segments: [
      { label: "Core topic fans", note: "Search & subscribe around the niche" },
      { label: "Recommendation browsers", note: "Discover via home/suggested — may not comment" },
      { label: "Returning subscribers", note: "Cadence-sensitive; notice upload gaps" },
    ],
    disclaimer,
  };
}

export function inferHookStyle(videos: ChannelVideoRecord[]): string {
  const titles = videos.slice(0, 10).map((v) => v.title).join(" ");
  if (/\?/.test(titles)) return "Curiosity-gap questions in titles";
  if (/\b(i |my |i'm )\b/i.test(titles)) return "Personal story / first-person hooks";
  if (/\b(\d+|top \d|ranked)\b/i.test(titles)) return "List / ranking hooks";
  if (/\b(vs|versus|beat)\b/i.test(titles)) return "Comparison / challenge hooks";
  return "Bold claim / pattern-interrupt titles";
}

export function inferEditingStyle(metrics: ChannelMetrics, videos: ChannelVideoRecord[]): string {
  if (metrics.shortsRatio > 0.6) return "Fast-paced vertical cuts, caption-forward Shorts";
  const avgDur =
    videos.reduce((s, v) => s + v.durationSec, 0) / Math.max(1, videos.length);
  if (avgDur > 600) return "Long-form chapters, B-roll heavy, slower pacing";
  if (avgDur > 180) return "Mid-form explainer pacing with periodic visual resets";
  return "Mixed format editing";
}

export function pickTopVideo(
  videos: ChannelVideoRecord[],
  mode: "shorts" | "long"
): ChannelVideoRecord | null {
  const filtered =
    mode === "shorts" ? videos.filter((v) => v.isShort) : videos.filter((v) => !v.isShort);
  const pool = filtered.length > 0 ? filtered : videos;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => b.views - a.views)[0];
}
