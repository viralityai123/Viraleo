import { formatTimestamp as formatTs } from "@/lib/dropoff";
import type { ChannelMetrics, ChannelVideoRecord } from "./types";

export interface RetentionEstimate {
  endRetentionPct: number;
  at15Pct: number;
  at30Pct: number;
  avgWatchTimeLabel: string;
  confidence: "low" | "medium";
  basis: string[];
  disclaimer: string;
  curve: { t: number; v: number }[];
  hookImpactLabel: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${rm.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function buildRetentionCurve(
  durationSec: number,
  hookScore: number,
  cutDensity: number,
  audioEnergy: number,
): { t: number; v: number }[] {
  const steps = 60;
  const markers: { timestamp: number; severity: "low" | "medium" | "high" }[] = [];

  if (hookScore < 85) {
    markers.push({
      timestamp: Math.min(2.5, durationSec * 0.05),
      severity: hookScore < 70 ? "high" : "medium",
    });
  }
  if (cutDensity < 0.6) {
    markers.push({ timestamp: durationSec * 0.35, severity: "medium" });
  }
  if (audioEnergy < 0.7) {
    markers.push({
      timestamp: durationSec * 0.62,
      severity: audioEnergy < 0.5 ? "high" : "medium",
    });
  }
  markers.push({ timestamp: durationSec * 0.82, severity: "low" });

  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * durationSec;
    let v = 100 - (i / steps) * 38;
    for (const m of markers) {
      const dist = Math.abs(t - m.timestamp);
      const sigma = 1.8;
      const hit =
        (m.severity === "high" ? 14 : m.severity === "medium" ? 8 : 4) *
        Math.exp(-(dist * dist) / (2 * sigma * sigma));
      v -= hit;
    }
    return { t, v: Math.max(28, Math.round(v * 10) / 10) };
  });
}

function sampleCurve(curve: { t: number; v: number }[], sec: number): number {
  const point = curve.reduce((p, c) => (Math.abs(c.t - sec) < Math.abs(p.t - sec) ? c : p));
  return Math.round(point.v);
}

/**
 * Estimates retention checkpoints from public engagement signals only.
 * Not YouTube Studio average view duration.
 */
export function estimateRetentionProxy(
  video: ChannelVideoRecord,
  metrics: ChannelMetrics,
): RetentionEstimate | null {
  if (video.views <= 0 || video.durationSec <= 0) return null;

  const likeRatio =
    metrics.avgLikeRate > 0 ? video.likeRate / metrics.avgLikeRate : video.likeRate > 0 ? 1.2 : 1;
  const commentRatio =
    metrics.avgCommentRate > 0
      ? video.commentRate / metrics.avgCommentRate
      : video.commentRate > 0
        ? 1.2
        : 1;
  const velocityRatio =
    metrics.medianViewsPerDay > 0 ? video.viewsPerDay / metrics.medianViewsPerDay : 1;

  const engagementScore = Math.min(
    1.5,
    likeRatio * 0.45 + commentRatio * 0.35 + Math.min(velocityRatio, 2) * 0.2,
  );
  const cliffPenalty = metrics.velocityCliff ? -4 : 0;

  const baseEnd = video.isShort || video.durationSec <= 60 ? 52 : video.durationSec > 600 ? 38 : 44;
  const endRetentionPct = clamp(
    baseEnd + engagementScore * 16 + Math.min(10, (velocityRatio - 1) * 5) + cliffPenalty,
    28,
    78,
  );

  const hookScore = clamp(65 + engagementScore * 22 + Math.min(8, velocityRatio * 3), 55, 95);
  const cutDensity = clamp(0.45 + engagementScore * 0.35 + (video.isShort ? 0.15 : 0), 0.35, 0.95);
  const audioEnergy = clamp(0.5 + engagementScore * 0.4, 0.4, 0.92);

  const curve = buildRetentionCurve(video.durationSec, hookScore, cutDensity, audioEnergy);
  const at15Pct = sampleCurve(curve, Math.min(15, video.durationSec));
  const at30Pct = sampleCurve(curve, Math.min(30, video.durationSec));
  const endFromCurve = sampleCurve(curve, video.durationSec);
  const endPct = clamp((endRetentionPct + endFromCurve) / 2, 28, 78);

  const watchSec = Math.round((endPct / 100) * video.durationSec);
  const avgWatchTimeLabel =
    video.durationSec <= 60
      ? `~${watchSec}s of ${video.durationSec}s (estimated watch-through)`
      : `~${formatDuration(watchSec)} of ${formatDuration(video.durationSec)} (estimated)`;

  const basis: string[] = [];
  if (likeRatio >= 1.15) basis.push("Like rate above this channel's recent average");
  else if (likeRatio < 0.85) basis.push("Like rate below channel average — softer hold likely");
  if (commentRatio >= 1.15) basis.push("Comment rate suggests active viewers stayed engaged");
  if (velocityRatio >= 1.5)
    basis.push("Views/day outperforms channel median — algorithm pushed reach");
  if (metrics.velocityCliff)
    basis.push("Channel-wide recent velocity dip — slight downward adjustment");
  if (video.isShort) basis.push("Shorts format baseline applied (~50–65% typical end hold)");
  else basis.push("Long-form baseline applied (~35–55% typical end hold)");
  if (basis.length === 0) basis.push("Engagement near channel norms");

  const confidence: "low" | "medium" =
    video.views >= 10_000 && metrics.videoCount >= 5 ? "medium" : "low";

  const hookImpactLabel =
    hookScore >= 88
      ? "Strong open (estimated)"
      : hookScore >= 75
        ? "Solid hook hold (estimated)"
        : "Hook needs sharper payoff (estimated)";

  return {
    endRetentionPct: endPct,
    at15Pct,
    at30Pct,
    avgWatchTimeLabel,
    confidence,
    basis,
    disclaimer:
      "Estimated from public likes, comments, and views/day — not YouTube Studio average view duration.",
    curve,
    hookImpactLabel,
  };
}

/** Build a minimal video record from videos.list when reference is outside the 25-upload sample. */
export function videoRecordFromApiItem(
  item: {
    id: string;
    snippet: { title: string; description?: string; publishedAt: string };
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
    contentDetails: { duration: string };
  },
  durationSec: number,
  isShort: boolean,
): ChannelVideoRecord {
  const views = parseInt(item.statistics.viewCount || "0", 10);
  const likes = parseInt(item.statistics.likeCount || "0", 10);
  const comments = parseInt(item.statistics.commentCount || "0", 10);
  const published = new Date(item.snippet.publishedAt).getTime();
  const daysLive = Math.max(1, (Date.now() - published) / (1000 * 60 * 60 * 24));

  return {
    id: item.id,
    title: item.snippet.title,
    description: (item.snippet.description || "").slice(0, 500),
    publishedAt: item.snippet.publishedAt,
    durationSec,
    isShort,
    views,
    likes,
    comments,
    viewsPerDay: views / daysLive,
    likeRate: views > 0 ? likes / views : 0,
    commentRate: views > 0 ? comments / views : 0,
    thumbnailUrl: "",
  };
}

export function formatRetentionCheckpoint(sec: number): string {
  return formatTs(sec);
}
