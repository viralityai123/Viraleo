import { createServerFn } from "@tanstack/react-start";
import type { ThumbnailFeatures } from "@/lib/ml/thumbnail-types";

export const thumbnailScoreMl = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      base64: string;
      features: ThumbnailFeatures;
      title: string;
      context: string;
      isShort: boolean;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { base64, features, title, context, isShort } = data;

    const workerAiKey = process.env.WORKERS_AI_KEY || "";
    const accountId = process.env.CF_ACCOUNT_ID || "";
    if (!workerAiKey || !accountId) {
      return null;
    }

    const prompt = `Analyze this YouTube thumbnail image.

TITLE: "${title}"
TOPIC: "${context}"
FORMAT: ${isShort ? "9:16 Shorts" : "16:9 long-form"}

Extracted visual features:
- ${features.faceCount} face(s), expression: ${JSON.stringify(features.faceExpressions)}
- OCR text detected: "${features.ocrText.slice(0, 100)}"
- Title-OCR synergy: ${(features.titleSynergyScore * 100).toFixed(0)}%
- Scene type: ${features.sceneType}
- Contrast: ${(features.contrast * 100).toFixed(0)}%
- Saturation: ${(features.saturation * 100).toFixed(0)}%
- Text coverage: ${(features.textAreaRatio * 100).toFixed(0)}%
- Rule-of-thirds: ${(features.thirdsScore * 100).toFixed(0)}%
- Edge density: ${(features.edgeDensity * 100).toFixed(0)}%

Return valid JSON only:
{
  "overallScore": number (0-10),
  "ctrEstimate": number (0.0-1.0 as decimal, e.g. 0.05 = 5%),
  "explanation": "1-2 sentence brutal critique",
  "metrics": [
    { "label": "Visual Contrast", "score": number (0-10), "copy": "..." },
    { "label": "Text Readability", "score": number (0-10), "copy": "..." },
    { "label": "Topic Relevance", "score": number (0-10), "copy": "..." },
    { "label": "Click Psychology", "score": number (0-10), "copy": "..." }
  ]
}`;

    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${workerAiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            image: [base64.split(",")[1]],
            max_tokens: 512,
          }),
        },
      );
      if (!res.ok) return null;
      const json = await res.json();
      const text = json.result?.response || "";
      const parsed = tryParseJson(text);
      if (!parsed) return null;
      return {
        overallScore: Math.min(10, Math.max(0, parsed.overallScore ?? 5)),
        ctrEstimate: Math.min(1, Math.max(0, parsed.ctrEstimate ?? 0.045)),
        explanation: parsed.explanation || "",
        metrics: Array.isArray(parsed.metrics) ? parsed.metrics.slice(0, 4) : [],
        modelVersion: "workers-ai-v1",
      };
    } catch {
      return null;
    }
  });

function tryParseJson(text: string): any {
  try {
    const trimmed = text.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
    return JSON.parse(trimmed);
  } catch {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch {}
    return null;
  }
}
