/** Strip internal metric keys / prompt jargon from user-facing copy. */
const REPLACEMENTS: [RegExp, string][] = [
  [/PUBLIC_METRICS/gi, "public channel data"],
  [/HOOK_INTELLIGENCE/gi, "hook analysis"],
  [/shortsRatio/gi, "shorts share"],
  [/medianViewsPerDay/gi, "median views per day"],
  [/avgViewsPerDay/gi, "average views per day"],
  [/velocityCliff/gi, "recent upload slowdown"],
  [/avgUploadIntervalDays/gi, "days between uploads"],
  [/avgCommentRate/gi, "comment rate"],
  [/avgLikeRate/gi, "like rate"],
  [/videoCount/gi, "upload count"],
  [/topOutlierTitles/gi, "top-performing titles"],
  [/RECENT_UPLOADS/gi, "recent uploads"],
  [/COMMENT_SAMPLES/gi, "comment samples"],
  [/DESCRIPTION_TIMELINE/gi, "video descriptions"],
];

export function sanitizeInsightText(text: string): string {
  let out = text;
  for (const [re, rep] of REPLACEMENTS) {
    out = out.replace(re, rep);
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

export function sanitizeInsights<T extends { label: string; detail: string }>(
  items: T[] | undefined
): T[] {
  if (!items?.length) return [];
  return items.map((item) => ({
    ...item,
    label: sanitizeInsightText(item.label),
    detail: sanitizeInsightText(item.detail),
  }));
}
