import { filterBoringInsights, isBoringCopy } from "@/lib/ai/viraleo-voice";
import { generateLLMJson, parseLLMJson } from "@/lib/llm";
import { attachIntelProof, buildFeatureAiContext } from "./ai-context";
import { extractVideoId, getYoutubeApiKey, isLikelyChannelInput, ytFetch } from "./client";
import { fetchChannelIntel, fetchChannelIntelByChannelId } from "./intel";
import type { ChannelIntelBundle } from "./types";

function buildNichePrompt(
  niche: string,
  format: "long" | "short",
  intelBlock: string,
  digestHeadline: string
): string {
  return `Niche viability audit for: "${niche}"
Format: ${format === "short" ? "Shorts" : "Long-form"}

${intelBlock || "No channel data — analyze from niche text only."}

DATA_HEADLINE: ${digestHeadline}

Rules:
- tagline = one savage sentence creators would retweet
- strengths/warnings must cite real video titles or views/day when intel exists
- pivots.subNiche must be specific (not "lifestyle vlog")

Return JSON:
{
  "nicheName": "cleaned, proper name for this niche",
  "overallGrade": "A+" | "A" | "B" | "C" | "D" | "F",
  "viabilityScore": number (0-100),
  "tagline": "a single punchy sentence verdict on this niche",
  "metrics": {
    "saturation": { "score": number (0-100), "label": "Low"|"Medium"|"High"|"Extreme", "insight": "2 sentence critique" },
    "trendVelocity": { "score": number (0-100), "direction": "Rising"|"Stable"|"Declining", "insight": "2 sentence critique" },
    "cpmRange": { "min": number, "max": number, "insight": "2 sentence critique about revenue potential" },
    "breakthroughDifficulty": { "score": number (0-100), "label": "Easy"|"Moderate"|"Hard"|"Brutal", "insight": "2 sentence critique" }
  },
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "warnings": ["warning 1", "warning 2"],
  "pivots": [
    { "subNiche": "specific sub-niche name", "why": "why this is smarter", "grade": "A"|"B"|"C" },
    { "subNiche": "specific sub-niche name", "why": "why this is smarter", "grade": "A"|"B"|"C" },
    { "subNiche": "specific sub-niche name", "why": "why this is smarter", "grade": "A"|"B"|"C" }
  ],
  "idealAudience": "describe the ideal viewer in 1-2 sentences (inferred if from public data)",
  "topFormats": ["format 1", "format 2", "format 3"]
}`;
}

export async function runNicheRanker(niche: string, format: "long" | "short") {
  const keys = (process.env.GEMINI_KEYS || "")
    .split(",")
    .map((k) => k.trim().replace(/['"]/g, ""))
    .filter(Boolean);
  const groqKey = process.env.GROQ_API_KEY || "";
  if (!keys.length && !groqKey) throw new Error("AI_KEYS_REQUIRED");

  let detectedNiche = niche.trim();
  let bundle: ChannelIntelBundle | undefined;
  let ctx: Awaited<ReturnType<typeof buildFeatureAiContext>> | undefined;
  const mode = format === "short" ? "shorts" : "long";

  if (getYoutubeApiKey()) {
    if (isLikelyChannelInput(niche)) {
      bundle = await fetchChannelIntel(niche);
      detectedNiche = bundle.inferredNiche;
      ctx = await buildFeatureAiContext(bundle, { mode });
    } else {
      const videoId = extractVideoId(niche);
      if (videoId) {
        const vData = await ytFetch<{
          items?: { snippet: { title: string; channelId: string; channelTitle: string } }[];
        }>("videos", { part: "snippet", id: videoId });
        const vItem = vData.items?.[0];
        if (vItem) {
          detectedNiche = `Niche centered around: ${vItem.snippet.title}`;
          bundle = await fetchChannelIntelByChannelId(vItem.snippet.channelId, vItem.snippet.channelTitle);
          ctx = await buildFeatureAiContext(bundle, {
            mode,
            referenceVideoId: videoId,
            referenceTitle: vItem.snippet.title,
          });
        }
      }
    }
  }

  const intelBlock = ctx?.intelBlock || "";
  const digestHeadline = ctx?.digest.headline || detectedNiche;

  const text = await generateLLMJson(
    buildNichePrompt(detectedNiche, format, intelBlock, digestHeadline),
    { quality: "quality" }
  );
  const parsed = parseLLMJson<Record<string, unknown>>(text);

  if (typeof parsed.tagline === "string" && isBoringCopy(parsed.tagline) && ctx) {
    parsed.tagline = ctx.digest.headline;
  }
  if (Array.isArray(parsed.strengths)) {
    parsed.strengths = filterBoringInsights(
      (parsed.strengths as string[]).map((s) => ({ label: "Strength", detail: s }))
    ).map((s) => s.detail);
  }

  if (ctx && bundle) {
    return { ...attachIntelProof(parsed, ctx), _intelBundle: bundle };
  }
  return bundle ? { ...parsed, _intelBundle: bundle } : parsed;
}
