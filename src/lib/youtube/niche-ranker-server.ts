import { filterBoringInsights, isBoringCopy } from "@/lib/ai/viraleo-voice";
import { estimateNicheMonetizable } from "@/lib/niche-rpm";
import type { MonetizationAnalysis } from "@/lib/niche-rpm";
import { generateLLMJson, parseLLMJson } from "@/lib/llm";
import { attachIntelProof, buildFeatureAiContext } from "./ai-context";
import { extractVideoId, getYoutubeApiKey, isLikelyChannelInput, ytFetch } from "./client";
import { fetchChannelIntel, fetchChannelIntelByChannelId } from "./intel";
import type { ChannelIntelBundle } from "./types";

function buildNichePrompt(
  niche: string,
  format: "long" | "short",
  intelBlock: string,
  digestHeadline: string,
): string {
  return `Niche viability audit for: "${niche}"
Format: ${format === "short" ? "Shorts" : "Long-form"}

${intelBlock || "No channel data — analyze from niche text only."}

DATA_HEADLINE: ${digestHeadline}

Rules:
- tagline = one savage sentence creators would retweet
- strengths/warnings must cite real video titles or views/day when intel exists
- pivots.subNiche must be specific (not "lifestyle vlog")

MONETIZATION ANALYSIS RULES (2025/2026 YouTube Reality):
Use this real knowledge to analyze monetization for this niche:

YOUTUBE SHORTS MONETIZATION FACTS (2025):
- Shorts entered the YouTube Partner Program (YPP) monetization pool in Feb 2023, replacing the Shorts Fund
- Shorts RPM is radically lower than long-form: $0.03–$0.12 RPM for most niches vs $3–$20+ for long-form
- YouTube pays creators a % of ad revenue from ads shown BETWEEN Shorts, not on individual Shorts
- Creator pool share: YouTube takes 55% of ad revenue from Shorts ad pool; remaining 45% is split based on views share
- High CPM Shorts niches: finance, business, AI/tech, real estate, legal, coding ($0.08–0.18 RPM)
- Low CPM Shorts niches: entertainment, comedy, gaming, compilation, reaction ($0.02–0.05 RPM)
- Shorts DO NOT count toward watch-time for YPP eligibility (only Shorts views/subscribers count for YPP threshold)
- Super Thanks works on Shorts — can significantly boost income for engaged communities
- Channel Memberships are accessible from Shorts IF channel is YPP eligible
- Shorts-first channels monetize BEST via: brand deals, affiliate links in description, merchandise, Super Thanks
- MAJOR RISK: "Reused content" policy aggressively demonetizes compilation/reaction/duet Shorts
- MAJOR RISK: AI voiceover Shorts face increased scrutiny and demonetization if repetitive/low-effort
- MAJOR RISK: Shorts about sensitive topics (medical, financial advice, crypto) get restricted ads automatically
- Shorts algorithm rewards COMPLETION RATE above all — niches with poor completion (>60s, slow intros) fail
- In 2025, YouTube expanded Shorts monetization globally but reduced per-view payouts in oversaturated categories

LONG-FORM MONETIZATION FACTS (2025):
- Long-form RPM ranges: Gaming $1.5–4, Lifestyle $3–7, Finance $8–25, Tech $5–15, Health $4–12, Education $4–10
- Mid-roll ads at 8+ minutes significantly increase revenue — niches where 10–20 min videos work are premium
- YouTube's advertiser-friendly content guidelines are strictly enforced — even indirect references to drugs, violence, or controversial topics can trigger limited ads
- YouTube Shopping affiliate program allows direct product links in videos — huge for product review niches

Analyze monetization considering:
1. Advertiser demand: Does this niche attract premium CPM advertisers?
2. Advertiser safety: Safe for brands? Avoids controversial topics?
3. Originality risk: Would YouTube flag as reused/low-effort content?
4. Format fit: Is this niche content naturally suited to the chosen format (${format === "short" ? "Shorts" : "long-form"})?
5. Policy risks: Any specific demonetization risks for this niche?
6. Revenue diversity: Beyond AdSense — sponsorships, affiliates, memberships, Super Thanks, merch?
7. Shorts-specific: For Shorts, what is the realistic RPM range for this niche and what is the best monetization path?

Return JSON:
{
  "nicheName": "cleaned, proper name for this niche",
  "overallGrade": "A+" | "A" | "B" | "C" | "D" | "F",
  "viabilityScore": number (0-100),
  "tagline": "a single punchy sentence verdict on this niche",
  "metrics": {
    "saturation": { "score": number (0-100), "label": "Low"|"Medium"|"High"|"Extreme", "insight": "2 sentence critique" },
    "trendVelocity": { "score": number (0-100), "direction": "Rising"|"Stable"|"Declining", "insight": "2 sentence critique" },
    "monetization": {
      "isMonetizable": "yes" | "limited" | "no",
      "adSenseEligibility": "high" | "medium" | "low" | "atRisk",
      "originalityRisk": "low" | "medium" | "high",
      "advertiserFriendliness": "safe" | "caution" | "restricted",
      "recommendedMonetization": ["AdSense", "Sponsorships", "Affiliates", "Digital Products", "Memberships", "Super Thanks", "Merch"],
      "policyWarnings": ["specific warning 1", "specific warning 2"],
      "shortsNote": "one sentence about Shorts viability including realistic RPM range for this niche",
      "longFormNote": "one sentence about long-form viability including realistic RPM range for this niche",
      "insight": "2-3 sentence actionable monetization analysis citing specific RPM ranges and best revenue path for THIS niche"
    },
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
          bundle = await fetchChannelIntelByChannelId(
            vItem.snippet.channelId,
            vItem.snippet.channelTitle,
          );
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
    { quality: "quality" },
  );
  const parsed = parseLLMJson<Record<string, unknown>>(text);

  if (typeof parsed.tagline === "string" && isBoringCopy(parsed.tagline) && ctx) {
    parsed.tagline = ctx.digest.headline;
  }
  if (Array.isArray(parsed.strengths)) {
    parsed.strengths = filterBoringInsights(
      (parsed.strengths as string[]).map((s) => ({ label: "Strength", detail: s })),
    ).map((s) => s.detail);
  }

  const metrics = (parsed.metrics || {}) as Record<string, unknown>;
  const llmMonetization = metrics.monetization as Partial<MonetizationAnalysis> | undefined;

  // Fallback: use keyword-based analysis if LLM didn't return clean monetization data
  if (!llmMonetization || !llmMonetization.isMonetizable) {
    const fallback = estimateNicheMonetizable(detectedNiche, format);
    metrics.monetization = fallback;
  } else {
    metrics.monetization = {
      isMonetizable: llmMonetization.isMonetizable || "limited",
      adSenseEligibility: llmMonetization.adSenseEligibility || "low",
      originalityRisk: llmMonetization.originalityRisk || "medium",
      advertiserFriendliness: llmMonetization.advertiserFriendliness || "safe",
      recommendedMonetization: llmMonetization.recommendedMonetization || [],
      policyWarnings: llmMonetization.policyWarnings || [],
      formatNotes: {
        shorts: llmMonetization.shortsNote || "",
        longForm: llmMonetization.longFormNote || "",
      },
      insight: llmMonetization.insight || "",
    };
  }

  // Remove any legacy RPM/CPM fields
  delete metrics.rpmRange;
  delete metrics.cpmRange;
  parsed.metrics = metrics;

  if (ctx && bundle) {
    return { ...attachIntelProof(parsed, ctx), _intelBundle: bundle };
  }
  return bundle ? { ...parsed, _intelBundle: bundle } : parsed;
}
