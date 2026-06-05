import { isBoringCopy } from "@/lib/ai/viraleo-voice";
import { generateLLMJson, parseLLMJson } from "@/lib/llm";
import { normalizeChannelInput } from "@/lib/channel-session";
import { normalizeThumbnailScores } from "@/lib/score-scale";
import { attachIntelProof, buildFeatureAiContext } from "./ai-context";
import { getYoutubeApiKey } from "./client";
import { fetchChannelIntel } from "./intel";

export interface ThumbnailTestInput {
  base64: string;
  title: string;
  context: string;
  isShort: boolean;
  compareToCompetitor?: boolean;
  channelQuery?: string;
  variantLabel?: "A" | "B";
}

export async function runThumbnailTest(data: ThumbnailTestInput) {
  const keysStr = process.env.GEMINI_KEYS || "";
  const keys = keysStr
    .split(",")
    .map((k) => k.trim().replace(/['"]/g, ""))
    .filter(Boolean);
  const groqKey = process.env.GROQ_API_KEY || "";
  if (!keys.length && !groqKey) throw new Error("AI_KEYS_REQUIRED");

  let intelBlock = "";
  let ctx: Awaited<ReturnType<typeof buildFeatureAiContext>> | undefined;
  const channelQ = data.channelQuery ? normalizeChannelInput(data.channelQuery) : "";
  if (data.compareToCompetitor && channelQ && getYoutubeApiKey()) {
    try {
      const bundle = await fetchChannelIntel(channelQ);
      ctx = await buildFeatureAiContext(bundle, { mode: data.isShort ? "shorts" : "long" });
      intelBlock = `${ctx.intelBlock}\n\nCompare USER thumbnail to competitor packaging patterns — cite their top video titles when relevant.`;
    } catch (e) {
      console.warn("Thumbnail channel intel skipped:", e);
    }
  }

  const parts = data.base64.split(",");
  const mimeType = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const base64Data = parts[1];

  const prompt = `Thumbnail CTR audit (image attached).

TITLE: "${data.title}"
TOPIC: "${data.context}"
FORMAT: ${data.isShort ? "9:16 Shorts" : "16:9 long-form"}
VARIANT: ${data.variantLabel || "A"}

${intelBlock || "No competitor data — judge image + title fit only."}

Rules:
- Name specific visual elements you see (colors, faces, text size, contrast)
- If Shorts: call out bottom/right UI safe zones
- scores 0–10 only
- explanation = 2 sentences max, brutal and specific

Return JSON:
{
  "overallScore": number,
  "explanation": "string",
  "metrics": [
    { "label": "Visual Contrast", "score": number, "copy": "..." },
    { "label": "Text Readability", "score": number, "copy": "..." },
    { "label": "Topic Relevance", "score": number, "copy": "..." },
    { "label": "Click Psychology", "score": number, "copy": "..." }
  ]
}`;

  const text = await generateLLMJson(prompt, {
    imageParts: [{ inlineData: { data: base64Data, mimeType } }],
    quality: "quality",
  });
  const parsed = parseLLMJson<{
    overallScore: number;
    explanation: string;
    metrics: { label: string; score: number; copy: string }[];
  }>(text);

  if (isBoringCopy(parsed.explanation)) {
    parsed.explanation = `Thumbnail for "${data.title}" — push contrast and readable text in the first glance; match what wins in this niche.`;
  }

  const normalized = normalizeThumbnailScores(parsed);
  if (ctx) {
    return attachIntelProof(normalized, ctx);
  }
  return normalized;
}
