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
- verdict = one brutal sentence a creator would screenshot — cite views/day or a video title
- escapeProtocol steps must name THEIR videos or upload cadence from data
- If velocity cliff: pattern = "Overnight Cliff" or "Declining"
- Do not invent strikes (default 0)

Return JSON:
{
  "channelName": "cleaned channel name/handle",
  "status": "healthy" | "warmup" | "restricted" | "shadowbanned",
  "statusLabel": "Healthy" | "Warmup Phase" | "Restricted Reach" | "Shadowbanned",
  "riskScore": number (0-100, higher = more risk),
  "verdict": "a single brutally honest 1-sentence verdict",
  "indexability": {
    "score": number (0-100),
    "status": "Indexed" | "Partially Indexed" | "De-indexed",
    "insight": "2 sentences on search index health"
  },
  "metadataHealth": {
    "score": number (0-100),
    "flaggedTerms": ["term 1", "term 2"],
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
    { "step": number, "action": "title", "detail": "specific action detail" },
    { "step": number, "action": "title", "detail": "specific action detail" },
    { "step": number, "action": "title", "detail": "specific action detail" },
    { "step": number, "action": "title", "detail": "specific action detail" }
  ],
  "recoveryTimeline": "estimated time to recover (e.g. '2-4 weeks with consistent uploading')"
}`;

  const text = await generateLLMJson(richPrompt, { quality: "quality" });
  const parsed = parseLLMJson<Record<string, unknown>>(text);

  if (typeof parsed.verdict === "string" && isBoringCopy(parsed.verdict)) {
    parsed.verdict = ctx.digest.headline;
  }

  return { ...attachIntelProof(parsed, ctx), _intelBundle: bundle };
}
