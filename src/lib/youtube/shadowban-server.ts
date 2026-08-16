import { isBoringCopy } from "@/lib/ai/viraleo-voice";
import { generateLLMJson, parseLLMJson } from "@/lib/llm";
import { attachIntelProof, buildFeatureAiContext } from "./ai-context";
import { fetchChannelIntel } from "./intel";
import { getYoutubeApiKey } from "./client";

export async function runShadowbanDetection(channel: string) {
  const keys = (process.env.GEMINI_KEYS || "")
    .split(",")
    .map((k) => k.trim().replace(/['"]/g, ""))
    .filter(Boolean);
  const groqKey = process.env.GROQ_API_KEY || "";
  if (!getYoutubeApiKey()) throw new Error("YOUTUBE_API_KEY_REQUIRED");
  if (!keys.length && !groqKey) throw new Error("AI_KEYS_REQUIRED");

  const bundle = await fetchChannelIntel(channel);
  const ctx = await buildFeatureAiContext(bundle);
  const channelName = bundle.meta.name;
  const velocityNote = bundle.metrics.velocityCliff
    ? `COMPUTED_VELOCITY_CLIFF: true (recent uploads avg ${bundle.metrics.velocityCliffRatio.toFixed(2)}x prior 5)`
    : `COMPUTED_VELOCITY_CLIFF: false (ratio ${bundle.metrics.velocityCliffRatio.toFixed(2)})`;

  const richPrompt = `Shadowban / reach audit for: "${channelName}"

${ctx.intelBlock}
${velocityNote}

DATA_HEADLINE: ${ctx.digest.headline}

Rules:
- verdict = one brutal sentence a creator would screenshot — cite real views/day or actual video titles from data
- escapeProtocol steps must name THEIR actual video titles, metadata issues, or upload cadence from data
- If velocity cliff: pattern = "Overnight Cliff" or "Declining"
- Do not invent strikes (default 0)
- warmedUp: true if channel has been consistently active for 90+ days with regular uploads and decent engagement
- readyToUpload: true only if status is "healthy" OR ("warmup" AND engagement metrics look stable)
- uploadSchedule: recommended cadence based on their actual upload history and niche (e.g. "3x/week Shorts + 1x/week long-form")
- nicheTrustScore: 0-100 how much the algorithm currently trusts this channel based on ALL signals
- CRITICAL: NEVER output generic placeholder strings like "term 1", "term 2", "title", "specific action detail", "step 1", or "N/A". If no metadata terms are flagged, return an empty array []. All escape protocol actions MUST contain real, specific, actionable steps tailored to this channel.

Return JSON:
{
  "channelName": "${channelName}",
  "status": "healthy" | "warmup" | "restricted" | "shadowbanned",
  "statusLabel": "Healthy" | "Warmup Phase" | "Restricted Reach" | "Shadowbanned",
  "riskScore": number (0-100, higher = more risk),
  "verdict": "a single brutally honest 1-sentence verdict citing real metrics or video names",
  "warmedUp": boolean,
  "readyToUpload": boolean,
  "uploadSchedule": "specific recommended upload cadence for this channel",
  "nicheTrustScore": number (0-100),
  "indexability": {
    "score": number (0-100),
    "status": "Indexed" | "Partially Indexed" | "De-indexed",
    "insight": "2 sentences on search index health based on channel data"
  },
  "metadataHealth": {
    "score": number (0-100),
    "flaggedTerms": ["actual flagged term if any, or empty array []"],
    "insight": "2 sentences on metadata and keyword risk"
  },
  "engagementVelocity": {
    "score": number (0-100),
    "pattern": "Healthy Growth" | "Overnight Cliff" | "Stagnant" | "Declining",
    "insight": "2 sentences on view-to-engagement ratio anomalies"
  },
  "communityHealth": {
    "score": number (0-100),
    "strikes": number,
    "insight": "2 sentences on community guidelines status"
  },
  "escapeProtocol": [
    { "step": 1, "action": "Specific Action Title", "detail": "Detailed concrete step to take" },
    { "step": 2, "action": "Specific Action Title", "detail": "Detailed concrete step to take" },
    { "step": 3, "action": "Specific Action Title", "detail": "Detailed concrete step to take" },
    { "step": 4, "action": "Specific Action Title", "detail": "Detailed concrete step to take" }
  ],
  "recoveryTimeline": "estimated time to recover (e.g. '2-4 weeks with consistent uploading')"
}`;

  const text = await generateLLMJson(richPrompt, { quality: "quality" });
  const parsed = parseLLMJson<Record<string, unknown>>(text);

  if (typeof parsed.verdict === "string" && isBoringCopy(parsed.verdict)) {
    parsed.verdict = ctx.digest.headline;
  }

  // Scrub any accidental generic placeholder text from LLM output
  if (parsed.metadataHealth && typeof parsed.metadataHealth === "object") {
    const meta = parsed.metadataHealth as any;
    if (Array.isArray(meta.flaggedTerms)) {
      meta.flaggedTerms = meta.flaggedTerms.filter(
        (t: string) =>
          typeof t === "string" &&
          !/^term\s*\d+$/i.test(t) &&
          !/^flagged\s*term/i.test(t) &&
          t.toLowerCase() !== "none" &&
          t.toLowerCase() !== "n/a",
      );
    }
  }

  if (Array.isArray(parsed.escapeProtocol)) {
    parsed.escapeProtocol = (parsed.escapeProtocol as any[]).map((step: any, idx: number) => ({
      step: typeof step.step === "number" ? step.step : idx + 1,
      action:
        typeof step.action === "string" && !step.action.includes("title")
          ? step.action
          : `Audit Video Metadata & Tags`,
      detail:
        typeof step.detail === "string" && !step.detail.includes("action detail")
          ? step.detail
          : `Review recent video titles and descriptions for sensationalized terms that trigger algorithmic suppression.`,
    }));
  }

  // Calculate quantitative statistics for empirical data proof
  const velocityPct = Math.round((bundle.metrics.velocityCliffRatio - 1) * 100);
  const statsSummary = {
    subsLabel: bundle.meta.subs || "N/A",
    subsCount: bundle.meta.subsCount || 0,
    totalIngestedUploads: bundle.videos.length,
    medianViewsPerDay: Math.round(bundle.metrics.medianViewsPerDay),
    avgLikeRatePercent: `${(bundle.metrics.avgLikeRate * 100).toFixed(1)}%`,
    avgCommentRatePercent: `${(bundle.metrics.avgCommentRate * 100).toFixed(2)}%`,
    uploadIntervalDays: bundle.metrics.avgUploadIntervalDays > 0
      ? `${bundle.metrics.avgUploadIntervalDays.toFixed(1)} days`
      : "Daily / Frequent",
    velocityChangeLabel: velocityPct > 0 ? `+${velocityPct}%` : `${velocityPct}%`,
    velocityCliffDetected: bundle.metrics.velocityCliff,
    recentTitles: bundle.metrics.recentUploadTitles.slice(0, 5),
  };

  return {
    ...attachIntelProof(parsed, ctx),
    statsSummary,
    _intelBundle: bundle,
  };
}
