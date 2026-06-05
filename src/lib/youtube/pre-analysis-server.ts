import { isBoringCopy } from "@/lib/ai/viraleo-voice";
import { generateLLMJson, parseLLMJson } from "@/lib/llm";
import { normalizeChannelInput } from "@/lib/channel-session";
import { toTenScale } from "@/lib/score-scale";
import { attachIntelProof, buildFeatureAiContext } from "./ai-context";
import { getYoutubeApiKey } from "./client";
import { fetchChannelIntel } from "./intel";

export interface PreAnalysisInput {
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  frames: string[];
  audioEnergy: number[];
  videoTitle?: string;
  niche?: string;
  compareToCompetitor?: boolean;
  channelQuery?: string;
}

interface PreAnalysisResult {
  overallScore: number;
  explanation: string;
  metrics: { label: string; score: number; copy: string }[];
  flags: { level: "critical" | "warning" | "ok"; title: string; body: string }[];
  dropoffMeta: { durationSec: number; cutDensity: number; audioEnergy: number; hookScore: number };
}

function normalizePreScores(data: PreAnalysisResult): PreAnalysisResult {
  return {
    ...data,
    overallScore: toTenScale(data.overallScore),
    metrics: data.metrics.map((m) => ({ ...m, score: toTenScale(m.score) })),
  };
}

function framesToParts(frames: string[]) {
  return frames.map((f) => {
    const parts = f.split(",");
    const mimeType = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    return { inlineData: { data: parts[1], mimeType } };
  });
}

export async function runPreAnalysis(data: PreAnalysisInput) {
  const { name, size, duration, width, height, frames, audioEnergy, videoTitle, niche, compareToCompetitor, channelQuery } =
    data;
  const isShort = height > width;
  const framesParts = framesToParts(frames);

  let intelBlock = "";
  let ctx: Awaited<ReturnType<typeof buildFeatureAiContext>> | undefined;
  const channelQ = channelQuery ? normalizeChannelInput(channelQuery) : "";
  if (compareToCompetitor && channelQ && getYoutubeApiKey()) {
    try {
      const bundle = await fetchChannelIntel(channelQ);
      ctx = await buildFeatureAiContext(bundle, { mode: isShort ? "shorts" : "long" });
      intelBlock = `${ctx.intelBlock}\n\nCOMPETITOR_CONTEXT: Compare pacing/hooks to this channel's top uploads — do not claim this file IS their video.`;
    } catch (e) {
      console.warn("Pre-analysis channel intel skipped:", e);
    }
  }

  const prompt = `Pre-upload audit for the USER's file (not a published competitor video).

${intelBlock || "No competitor channel data — score only from frames + metadata below."}

PLANNED_TITLE: "${videoTitle || name}"
NICHE: "${niche || "General YouTube"}"
DURATION: ${duration.toFixed(1)}s · ${width}×${height} (${isShort ? "Shorts" : "long-form"})
FILE_SIZE_MB: ${(size / 1024 / 1024).toFixed(2)}

Frames at ~0.5s, 3s, 8s, 25s are attached — describe ONLY what you see.
Audio energy samples (0–1): [${audioEnergy.map((e) => e.toFixed(2)).join(", ")}]

Rules:
- explanation = 2 punchy sentences, no guru fluff
- flags must be actionable (safe zones, hook clarity, pacing)
- scores 1–10 only, USE THE FULL RANGE — not every score should be 7-9. Spread them.
- each metric copy must reference something actually visible in the frames (color, composition, text, expressions, cuts, audio cues)
- never say "good pacing" or "strong hook" without saying WHY based on specific frame content

Return JSON:
{
  "overallScore": number,
  "explanation": "string",
  "metrics": [
    { "label": "Hook Strength", "score": number, "copy": "..." },
    { "label": "Pacing Score", "score": number, "copy": "..." },
    { "label": "Content Idea", "score": number, "copy": "..." },
    { "label": "Editing", "score": number, "copy": "..." },
    { "label": "Thumbnail Potential", "score": number, "copy": "..." },
    { "label": "Retention Forecast", "score": number, "copy": "..." }
  ],
  "flags": [{ "level": "critical"|"warning"|"ok", "title": "string", "body": "string" }],
  "dropoffMeta": { "durationSec": number, "cutDensity": number, "audioEnergy": number, "hookScore": number }
}`;

  const text = await generateLLMJson(prompt, { imageParts: framesParts, quality: "quality" });
  const parsed = parseLLMJson<PreAnalysisResult>(text);
  parsed.dropoffMeta.durationSec = duration;
  if (parsed.dropoffMeta.hookScore <= 10) {
    parsed.dropoffMeta.hookScore = parsed.dropoffMeta.hookScore * 10;
  }
  if (isBoringCopy(parsed.explanation)) {
    parsed.explanation = `Your ${isShort ? "Short" : "upload"} "${videoTitle || name}" needs a harder first-frame payoff — fix hook clarity before you publish.`;
  }
  const boringFallback: Record<string, string> = {
    "Hook Strength": `The first 3s of "${videoTitle || name}" lack a clear focal point. Add a face or bold text overlay at 0:00.`,
    "Pacing Score": `Cut density drops mid-roll for "${videoTitle || name}". Insert B-roll or quick transitions every 4s.`,
    "Content Idea": `"${videoTitle || name}" fits ${niche || "your niche"} but needs a sharper angle — the concept is broad, tighten the hook premise.`,
    "Editing": `Transitions feel abrupt in "${videoTitle || name}". Add cross-fades or motion blur between cuts.`,
    "Thumbnail Potential": `The first frame lacks contrast. Use a bright focal point and bold text overlay for "${videoTitle || name}".`,
    "Retention Forecast": `Expected retention curve drops at mid-point for "${videoTitle || name}". Front-load a stronger hook to flatten decay.`,
  };
  parsed.metrics = parsed.metrics.map((m) => ({
    ...m,
    copy: isBoringCopy(m.copy) ? (boringFallback[m.label] || `Inspect "${name}" frame at ${m.label === "Hook Strength" ? "0–3s" : "mid-roll"} — adjust based on competitors.`) : m.copy,
  }));

  const normalized = normalizePreScores(parsed);
  if (ctx) {
    return attachIntelProof(normalized as unknown as Record<string, unknown>, ctx);
  }
  return normalized;
}
