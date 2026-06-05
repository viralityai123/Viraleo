import { formatCount } from "./client";
import type { ChannelIntelBundle, ChannelVideoRecord } from "./types";

/** Punchy one-liners computed from real stats — always interesting even when AI is bland. */
export function buildChannelDigest(bundle: ChannelIntelBundle, ref?: ChannelVideoRecord) {
  const m = bundle.metrics;
  const top = [...bundle.videos].sort((a, b) => b.viewsPerDay - a.viewsPerDay)[0];
  const refV = ref || top;
  const med = m.medianViewsPerDay || 1;
  const ratio = refV ? (refV.viewsPerDay / med).toFixed(1) : "—";

  const headlines: string[] = [];
  if (refV && refV.viewsPerDay >= med * 1.5) {
    headlines.push(
      `"${refV.title.slice(0, 50)}${refV.title.length > 50 ? "…" : ""}" is eating the feed at ${ratio}× their median velocity.`
    );
  } else if (m.velocityCliff) {
    headlines.push(
      `Recent uploads are bleeding — ~${Math.round(m.velocityCliffRatio * 100)}% of their old views/day. Packaging broke before the algorithm did.`
    );
  } else if (top) {
    headlines.push(
      `Clone "${top.title.slice(0, 45)}${top.title.length > 45 ? "…" : ""}" first — ${formatCount(top.views)} views, ~${Math.round(top.viewsPerDay)} views/day.`
    );
  }

  const bullets: string[] = [
    `${Math.round(m.shortsRatio * 100)}% Shorts in sample · uploads every ~${Math.round(m.avgUploadIntervalDays)} days`,
    `Median ${medianLabel(m)} views/day across ${m.videoCount} public uploads`,
  ];

  if (bundle.inferredNiche) bullets.push(`Niche read: ${bundle.inferredNiche}`);
  if (m.topOutlierTitles[0]) {
    bullets.push(`Outlier title to steal structure from: "${m.topOutlierTitles[0].slice(0, 55)}${m.topOutlierTitles[0].length > 55 ? "…" : ""}"`);
  }

  return {
    headline: headlines[0] || `Channel intel ready for ${bundle.meta.name}.`,
    bullets: bullets.slice(0, 4),
    ratio,
  };
}

function medianLabel(m: ChannelIntelBundle["metrics"]): string {
  return String(Math.round(m.medianViewsPerDay));
}
