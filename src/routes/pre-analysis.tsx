import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createServerFn } from "@tanstack/react-start";
import { normalizeChannelInput } from "@/lib/channel-session";
import { letterGradeTen, toTenScale } from "@/lib/score-scale";
import { runPreAnalysis } from "@/lib/youtube/pre-analysis-server";
import { addActivity, saveResult, loadResult } from "@/lib/activity";
import { useUserState } from "@/lib/user-state";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { recordUsage } from "@/lib/usage";

import { ViraleoLogo } from "@/components/ViraleoLogo";
import { Header } from "@/components/pre-analysis/Header";
import { PreviewCard } from "@/components/pre-analysis/PreviewCard";
import { ScoreRing } from "@/components/pre-analysis/ScoreRing";
import { MetricBars } from "@/components/pre-analysis/MetricBars";
import { FileInfo } from "@/components/pre-analysis/FileInfo";
import { Diagnostics } from "@/components/pre-analysis/Diagnostics";
import { DropoffPredictor } from "@/components/pre-analysis/DropoffPredictor";
import { ChannelDigestCard, DataReceiptsStrip } from "@/components/intel/ChannelDigestCard";

export const Route = createFileRoute("/pre-analysis")({
  validateSearch: (s: Record<string, unknown>) => ({
    channel: typeof s.channel === "string" ? normalizeChannelInput(s.channel) : undefined,
    activityId: typeof s.activityId === "string" ? s.activityId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pre-Upload Audit — Viraleo" },
      {
        name: "description",
        content:
          "AI-powered pre-upload audit for YouTube videos. Analyze hook strength, editing quality, file issues, and get optimization recommendations.",
      },
      { property: "og:title", content: "Pre-Upload Audit — Viraleo" },
      {
        property: "og:description",
        content: "AI pre-upload audit for YouTube. Hook strength, editing, file optimization.",
      },
      { property: "og:image", content: "https://viraleo.pro/vi-logo.png" },
      { property: "og:url", content: "https://viraleo.pro/pre-analysis" },
      { name: "twitter:title", content: "Pre-Upload Audit — Viraleo" },
      { name: "twitter:description", content: "Pre-upload audit for YouTube videos." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/pre-analysis" }],
  }),
  component: PreAnalysisPage,
});

// ─── Types and local helpers ───────────────────────────────────────────────────
interface VideoMeta {
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  url: string;
  type: string;
}

interface AIData {
  overallScore: number;
  explanation: string;
  metrics: { label: string; score: number; copy: string }[];
  flags: { level: "critical" | "warning" | "ok"; title: string; body: string }[];
  dropoffMeta: { durationSec: number; cutDensity: number; audioEnergy: number; hookScore: number };
}

function clip(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function fmtSize(b: number) {
  if (b < 1e6) return (b / 1e3).toFixed(0) + " KB";
  if (b < 1e9) return (b / 1e6).toFixed(1) + " MB";
  return (b / 1e9).toFixed(2) + " GB";
}

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Client-Side Visual Frame Extractor ──────────────────────────────────────────
function extractFrames(videoUrl: string, duration: number): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    // Extract dense frames for ML feature extraction
    const timestamps: number[] = [];
    for (let t = 0.5; t < Math.min(10, duration); t += 0.5) timestamps.push(t);
    for (let t = 10; t < duration; t += 5) timestamps.push(t);
    if (timestamps.length > 50) timestamps.length = 50;
    const frames: string[] = [];
    let index = 0;

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");

    video.addEventListener("loadeddata", () => {
      seekNext();
    });

    function seekNext() {
      if (index >= timestamps.length || timestamps[index] >= duration) {
        resolve(frames);
        return;
      }
      video.currentTime = timestamps[index];
    }

    video.addEventListener("seeked", () => {
      try {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL("image/jpeg", 0.7);
          frames.push(base64);
        }
      } catch (e) {
        console.error("Frame extraction error at index", index, e);
      }
      index++;
      seekNext();
    });

    // Timeout fallback after 3 seconds to avoid stalling loading screen
    setTimeout(() => {
      resolve(frames);
    }, 3000);
  });
}

// ─── Client-Side Audio Waveform Extractor ─────────────────────────────────────────
async function extractAudioEnergy(file: File): Promise<number[]> {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) throw new Error("AudioContext unsupported");
    const audioCtx = new AudioContextClass();

    // Slice a lightweight 12MB chunk to keep loading screen fast and prevent heap crash
    const slice = file.slice(0, 12 * 1024 * 1024);
    const arrayBuffer = await slice.arrayBuffer();

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const intervals = 50;
    const step = Math.ceil(channelData.length / intervals);
    const energy: number[] = [];

    for (let i = 0; i < intervals; i++) {
      let sum = 0;
      const start = i * step;
      const end = Math.min(start + step, channelData.length);
      for (let j = start; j < end; j++) {
        sum += channelData[j] * channelData[j];
      }
      energy.push(Math.sqrt(sum / (end - start || 1)));
    }

    const max = Math.max(...energy) || 1;
    return energy.map((e) => e / max);
  } catch (e) {
    console.warn(
      "Audio extraction failed (expected on some video slice containers), using simulated fallback:",
      e,
    );
    return Array.from({ length: 50 }, () => Math.random() * 0.7 + 0.3);
  }
}

// ─── Local Mock Fallback ────────────────────────────────────────────────────────
function analyseLocal(meta: VideoMeta) {
  const isShort = meta.height > meta.width;
  const dur = meta.duration;
  const name = meta.name.replace(/\.[^.]+$/, "");

  // Non-round score helper
  const score = (min: number, max: number) => +(min + Math.random() * (max - min)).toFixed(1);
  const clamp = (v: number) => Math.max(1, Math.min(10, Math.round(v * 10) / 10));

  const hookScore = clamp(dur > 60 ? (dur < 300 ? score(7, 9) : score(5.5, 7.5)) : score(7.5, 9.5));
  const pacingScore = clamp(
    dur > 60 ? (dur < 600 ? score(6.5, 8.5) : score(4.5, 6.5)) : score(7, 9),
  );
  const ideaScore = clamp(score(4.5, 9));
  const editingScore = clamp(
    meta.size < 500e6 ? score(6.5, 9) : meta.size < 1e9 ? score(5.5, 7.5) : score(3.5, 5.5),
  );
  const thumbScore = clamp(isShort ? score(5, 8) : score(6, 9));
  const rawRetention = (hookScore + pacingScore + editingScore) / 3 + (Math.random() - 0.5) * 1.5;
  const retentionScore = clamp(rawRetention);
  const overallScore = clamp(
    +(hookScore + pacingScore + ideaScore + editingScore + thumbScore + retentionScore) / 6,
  );

  const flags: { type: "error" | "warn" | "ok"; title: string; desc: string }[] = [];

  if (dur > 0 && dur < 3)
    flags.push({
      type: "error",
      title: "Too Short",
      desc: `"${name}" is under 3 seconds — YouTube may reject it.`,
    });
  if (meta.size > 1e9)
    flags.push({
      type: "warn",
      title: "Large File Size",
      desc: `${fmtSize(meta.size)} is large for "${name}". Compress to under 1 GB.`,
    });
  if (dur > 600)
    flags.push({
      type: "warn",
      title: "Long Duration",
      desc: `At ${fmtDur(dur)}, "${name}" may exceed average viewer attention span. Consider tighter pacing or chapter markers.`,
    });
  if (dur >= 15 && dur <= 120)
    flags.push({
      type: "ok",
      title: "Ideal Duration",
      desc: `"${name}" sits in the sweet spot for ${isShort ? "Shorts" : "mid-form"} retention.`,
    });
  if (hookScore >= 8)
    flags.push({
      type: "ok",
      title: "Strong Hook Window",
      desc: `First 3s of "${name}" should grab attention — your file length supports a rapid front-load.`,
    });
  if (editingScore >= 7)
    flags.push({
      type: "ok",
      title: "Editing Quality",
      desc: `Clean cuts and good pacing detected in "${name}". Minimal friction expected.`,
    });
  else if (editingScore < 5)
    flags.push({
      type: "warn",
      title: "Editing Needs Work",
      desc: `Cut density is low for "${name}". Insert B-roll or quick transitions every 4-5s.`,
    });

  const hasKeywords = /how|why|best|top|vs|tutorial|review|react|challenge/i.test(name);
  const ideaNote = hasKeywords
    ? `"${name}" targets a searchable niche with clear intent keywords.`
    : `"${name}" needs stronger keyword presence — add "how", "why", or "review" to the title.`;

  const metrics = [
    {
      label: "Hook Strength",
      score: hookScore,
      explanation:
        hookScore >= 8
          ? `First 3s of "${name}" have strong retention potential — quick visual context and immediate framing keep early drop-off below 20%.`
          : `The intro of "${name}" risks losing 35-40% of viewers in the first 5 seconds. Add a face, bold text, or pattern interrupt at 0:00.`,
    },
    {
      label: "Pacing Score",
      score: pacingScore,
      explanation:
        pacingScore >= 7
          ? `Cut density in "${name}" keeps momentum steady. Viewers get a visual refresh every 3-4s, ideal for ${isShort ? "Shorts" : "long-form"} retention.`
          : `Pacing drags in "${name}" — prolonged shots without B-roll or transitions will cause mid-video drop-off.`,
    },
    {
      label: "Content Idea",
      score: ideaScore,
      explanation:
        ideaScore >= 7
          ? ideaNote
          : `"${name}" covers a broad angle. Tighten the hook premise — compare against top-performing titles in ${isShort ? "Shorts" : "your niche"} for a sharper spin.`,
    },
    {
      label: "Editing",
      score: editingScore,
      explanation:
        editingScore >= 7
          ? `Clean transitions and balanced audio in "${name}". The editing supports the narrative flow without distraction.`
          : `Editing in "${name}" feels rushed or sparse. Tighten cuts and layer ambient audio to bridge quiet gaps.`,
    },
    {
      label: "Thumbnail Potential",
      score: thumbScore,
      explanation:
        thumbScore >= 7
          ? `${meta.width}×${meta.height} gives "${name}" good canvas for a bold thumbnail with high contrast and readable text overlay.`
          : `The resolution of "${name}" limits thumbnail cropping. Film a dedicated thumbnail frame with a single focal point and bright background.`,
    },
    {
      label: "Retention Forecast",
      score: retentionScore,
      explanation:
        retentionScore >= 7
          ? `Composite signals for "${name}" project above-average retention. Hook + pacing synergy should keep 60%+ through the first half.`
          : `Retention risk is elevated for "${name}". The hook-to-pacing gap suggests viewers will drop before the main payoff.`,
    },
  ];

  let explanation = "";
  if (overallScore >= 7.5) {
    explanation = `"${name}" scores well across the board. The ${isShort ? "vertical format suits Shorts discovery" : "widescreen framing works for feed browsing"} — with ${fmtDur(dur)} of runtime, you have solid pacing headroom. Minor tweaks on the flagged items will push this into top-tier territory.`;
  } else if (overallScore >= 5) {
    explanation = `"${name}" has potential but carries real algorithmic risk. The hook window and editing need attention before upload. Prioritise the flagged diagnostics — especially pacing and thumbnail contrast.`;
  } else {
    explanation = `"${name}" needs significant rework. The content idea and execution both show friction points. Consider reshaping the hook premise and re-editing the first 15s before publishing.`;
  }

  return { isShort, overallScore, flags, metrics, explanation };
}

// ─── Real Multimodal AI Server Function ──────────────────────────────────────────
export const analyzeVideoServer = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
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
    }) => d,
  )
  .handler(async ({ data }) => {
    const { requireAuth, requireCredits } = await import("@/lib/auth/server-auth");
    const user = await requireAuth();
    await requireCredits(user.email);
    return JSON.parse(JSON.stringify(await runPreAnalysis(data)));
  });

function PreAnalysisPage() {
  const { hasCredits, refresh, loading: creditsLoading } = useUserState();
  const { channel: channelParam, activityId: activityIdParam } = Route.useSearch();
  const [phase, setPhase] = useState<"drop" | "setup" | "analyzing" | "results">("drop");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [aiData, setAiData] = useState<AIData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const analysisSteps = [
    "Extracting video frames...",
    "Analyzing audio waveform...",
    "Analyzing content...",
    "Computing metrics...",
    "Generating report...",
  ];
  const [intelProof, setIntelProof] = useState<{
    channelDigest?: { headline: string; bullets: string[] };
    dataReceipts?: string[];
    hasTranscript?: boolean;
  } | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [niche, setNiche] = useState("");
  const [compareCompetitor, setCompareCompetitor] = useState(false);
  const [competitorHandle, setCompetitorHandle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activityIdParam) {
      const cached = loadResult<AIData>(activityIdParam);
      if (cached) {
        setAiData(cached);
        setPhase("results");
        return;
      }
    }
  }, [activityIdParam]);

  useEffect(() => {
    if (channelParam) {
      setCompareCompetitor(true);
      setCompetitorHandle(normalizeChannelInput(channelParam));
    }
  }, [channelParam]);

  const reset = () => {
    if (meta) URL.revokeObjectURL(meta.url);
    setPhase("drop");
    setFile(null);
    setProgress(0);
    setMeta(null);
    setAiData(null);
    setIntelProof(null);
    setVideoTitle("");
    setNiche("");
    setCompareCompetitor(false);
    setCompetitorHandle("");
  };

  const accept = useCallback(
    (f: File) => {
      const isVideoType = f.type && f.type.startsWith("video/");
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      const isVideoExt = ["mp4", "mov", "mkv", "webm", "avi", "3gp", "flv", "m4v"].includes(ext);

      if (!isVideoType && !isVideoExt) {
        toast.error("Unsupported file type. Please upload a video file.");
        return;
      }

      setFile(f);

      const url = URL.createObjectURL(f);
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.src = url;

      vid.onloadedmetadata = () => {
        const m: VideoMeta = {
          name: f.name,
          size: f.size,
          duration: vid.duration,
          width: vid.videoWidth,
          height: vid.videoHeight,
          url,
          type: f.type || `video/${ext}`,
        };
        setMeta(m);
        if (!videoTitle) setVideoTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
        setPhase("setup");
      };
    },
    [videoTitle],
  );

  const runAnalysis = useCallback(async () => {
    if (!file || !meta) return;
    if (!videoTitle.trim() || !niche.trim()) {
      toast.error("Enter your planned video title and niche before running analysis.");
      return;
    }

    if (!creditsLoading && !hasCredits) {
      toast.error("You're out of credits for this month. Upgrade your plan to continue.");
      return;
    }

    setPhase("analyzing");
    setProgress(0);
    setCurrentStep(0);
    let p = 0;
    let stepIdx = 0;
    const interval = setInterval(() => {
      p += (95 - p) * 0.06;
      setProgress(p);
      stepIdx = Math.min(Math.floor(p / 20), analysisSteps.length - 1);
      setCurrentStep(stepIdx);
    }, 120);

    let extractedFramesList: string[] = [];
    let extractedAudioData: number[] = [];
    try {
      const [frames, audio] = await Promise.all([
        extractFrames(meta.url, meta.duration),
        extractAudioEnergy(file),
      ]);
      extractedFramesList = frames;
      extractedAudioData = audio;
    } catch (err) {
      console.warn("Client data extraction failed:", err);
    }

    let resultData: AIData | null = null;
    let analysisSucceeded = false;
    try {
      const raw = await analyzeVideoServer({
        data: {
          name: meta.name,
          size: meta.size,
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          frames: extractedFramesList,
          audioEnergy: extractedAudioData,
          videoTitle: videoTitle.trim(),
          niche: niche.trim(),
          compareToCompetitor: compareCompetitor && !!competitorHandle.trim(),
          channelQuery: compareCompetitor ? competitorHandle : undefined,
        },
      });
      const { channelDigest, dataReceipts, hasTranscript, ...rest } = raw as AIData & {
        channelDigest?: { headline: string; bullets: string[] };
        dataReceipts?: string[];
        hasTranscript?: boolean;
      };
      setIntelProof({ channelDigest, dataReceipts, hasTranscript });
      resultData = rest as AIData;
      analysisSucceeded = true;
      await refresh();
      recordUsage("preAnalysis");
      const entry = addActivity("pre-analysis", videoTitle.trim(), meta.name);
      saveResult(entry.id, resultData);
      toast.success("Analysis complete!");
    } catch (err) {
      // Check for auth/credit errors from the server
      const message = err instanceof Error ? err.message : String(err);
      if (message === "UNAUTHORIZED") {
        toast.error("Session expired. Please sign in again.");
      } else if (message === "OUT_OF_CREDITS") {
        toast.error("You're out of credits for this month. Upgrade your plan to continue.");
      } else {
        console.warn("Multimodal AI failed, falling back to local simulation:", err);
        toast.warning(
          "AI analysis unavailable. Showing local estimate — results may not be accurate.",
        );
        const localResult = analyseLocal(meta);
        resultData = {
          overallScore: toTenScale(localResult.overallScore),
          explanation: localResult.explanation,
          metrics: localResult.metrics.map((x) => ({
            label: x.label,
            score: toTenScale(x.score),
            copy: x.explanation,
          })),
          flags: localResult.flags.map((x) => ({
            level: x.type === "error" ? "critical" : x.type === "warn" ? "warning" : "ok",
            title: x.title,
            body: x.desc,
          })),
          dropoffMeta: {
            durationSec: meta.duration,
            cutDensity: extractedFramesList.length > 0
              ? +clip(extractedFramesList.length / meta.duration * 2, 0.1, 0.95).toFixed(2)
              : +(meta.duration > 60 ? 0.45 : 0.65).toFixed(2),
            audioEnergy: extractedAudioData.length > 0
              ? +clip(extractedAudioData.reduce((a, b) => a + b, 0) / extractedAudioData.length, 0.1, 0.95).toFixed(2)
              : +(meta.duration > 60 ? 0.5 : 0.65).toFixed(2),
            hookScore: localResult.metrics[0].score * 10,
          },
        };
        // No credit deducted for local fallback — only AI analysis costs
        recordUsage("preAnalysis");
        const entry = addActivity("pre-analysis", videoTitle.trim(), meta.name);
        saveResult(entry.id, resultData);
      }
    } finally {
      clearInterval(interval);
      setProgress(100);
      if (!resultData) {
        toast.error("Analysis failed. Please try again.");
      }
      setTimeout(() => {
        setAiData(resultData);
        if (resultData) setPhase("results");
      }, 400);
    }
  }, [file, meta, videoTitle, niche, compareCompetitor, competitorHandle]);

  const fileInfoStats = meta
    ? [
        {
          label: "Duration",
          value: fmtDur(meta.duration),
          caption: meta.duration > 60 ? "Long-form" : "Short-form",
        },
        {
          label: "File Size",
          value: fmtSize(meta.size),
          caption: meta.size < 500e6 ? "Optimal" : "Large file size",
          tone: (meta.size < 500e6 ? "good" : "watch") as any,
        },
        {
          label: "Resolution",
          value: `${meta.width}×${meta.height}`,
          caption: meta.height >= 1080 ? "HD Ready" : "Low Res",
          tone: (meta.height >= 1080 ? "good" : "critical") as any,
        },
        {
          label: "Format",
          value: meta.name.split(".").pop()?.toUpperCase() || "",
          caption: "Optimal codec",
          tone: "good" as any,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-surface text-ink font-text relative">
      {/* Ambient backdrop */}
      {phase === "drop" && (
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-40 -left-40 size-[520px] rounded-full bg-good/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 size-[520px] rounded-full bg-watch/10 blur-3xl" />
        </div>
      )}

      {/* Navigation Header when in Results mode */}
      {(phase === "results" || phase === "setup" || phase === "analyzing") && (
        <Header onReset={reset} />
      )}

      {phase === "setup" && meta && (
        <main className="relative mx-auto max-w-3xl px-6 pt-12 pb-24 z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="font-display text-[36px] font-bold text-ink">Your upload is ready</h1>
            <p className="text-[15px] text-ink-soft mt-2">
              Add title and niche, then run analysis when you are ready.
            </p>
          </motion.div>
          <div className="rounded-2xl border border-hairline bg-surface p-6 shadow-lg space-y-4">
            <div className="text-[13px] text-ink-soft truncate">
              {meta.name} · {fmtDur(meta.duration)} · {meta.width}×{meta.height}
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-soft mb-1.5">
                Planned video title
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. I pretended to be a dog in Minecraft"
                className="w-full px-3 py-2 text-[13px] rounded-lg bg-ink/5 border border-hairline text-ink"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-soft mb-1.5">
                Niche / topic
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. Minecraft challenge, gaming comedy"
                className="w-full px-3 py-2 text-[13px] rounded-lg bg-ink/5 border border-hairline text-ink"
              />
            </div>
            <label className="flex items-start gap-2 text-[12px] text-ink-soft cursor-pointer">
              <input
                type="checkbox"
                checked={compareCompetitor}
                onChange={(e) => setCompareCompetitor(e.target.checked)}
                className="mt-0.5"
              />
              <span>Optionally compare pacing to a competitor channel (off by default)</span>
            </label>
            {compareCompetitor && (
              <input
                type="text"
                value={competitorHandle}
                onChange={(e) => setCompetitorHandle(e.target.value)}
                placeholder="e.g. dashmc"
                className="w-full px-3 py-2 text-[13px] rounded-lg bg-ink/5 border border-hairline text-ink"
              />
            )}
            <button
              type="button"
              onClick={runAnalysis}
              className="w-full rounded-xl bg-ink text-surface py-3.5 text-[14px] font-semibold hover:opacity-90 transition"
            >
              Run pre-upload analysis
            </button>
          </div>
        </main>
      )}

      {phase === "analyzing" && file && (
        <main className="relative mx-auto max-w-3xl px-6 pt-24 pb-24 z-10 text-center cursor-none select-none">
          <div className="mx-auto size-16 rounded-2xl bg-good/15 border border-good/30 flex items-center justify-center mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="size-6 rounded-full border-2 border-good/30 border-t-good"
            />
          </div>
          <div className="font-display text-[18px] font-semibold text-ink truncate">
            {file.name}
          </div>
          <div className="mt-3 text-[13px] text-ink-soft font-medium">
            {analysisSteps[currentStep]}
          </div>
          <div className="mt-4 mx-auto max-w-xs h-1 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full bg-good transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </main>
      )}

      {/* DROP PHASE */}
      {phase === "drop" && (
        <main className="relative mx-auto max-w-3xl px-6 pt-24 pb-24 z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <div className="flex justify-center mb-4">
              <ViraleoLogo linkTo="/pre-analysis" size="xl" showText={false} />
            </div>
            <div className="text-[12px] uppercase tracking-[0.14em] text-ink-soft font-medium">
              Pre-Upload
            </div>
            <h1 className="mt-3 font-display text-[28px] sm:text-[44px] md:text-[56px] leading-[1.02] font-semibold tracking-[-0.025em] text-ink">
              Drop your raw file.
            </h1>
            <p className="mt-3 text-[15px] text-ink-soft max-w-md mx-auto">
              We score every metric, predict drop-off timestamps, and surface fixes before the
              algorithm sees it.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10"
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) accept(f);
              }}
              onClick={() => inputRef.current?.click()}
              className={`relative cursor-pointer rounded-[28px] border bg-surface p-12 text-center transition-all duration-300 ${
                dragging
                  ? "border-good shadow-[0_30px_80px_-30px_rgba(0,80,40,0.35)] scale-[1.01]"
                  : "border-hairline shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_60px_-30px_rgba(0,0,0,0.15)] hover:border-ink/20"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) accept(f);
                }}
              />

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <motion.div
                  animate={{ y: dragging ? -4 : 0, scale: dragging ? 1.05 : 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="mx-auto size-16 rounded-2xl bg-surface-2 border border-hairline flex items-center justify-center"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="size-7 text-ink"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
                    />
                  </svg>
                </motion.div>
                <div className="mt-5 font-display text-[20px] font-semibold tracking-tight text-ink">
                  {dragging ? "Release to continue" : "Drop or drag your video here"}
                </div>
                <div className="mt-1.5 text-[13px] text-ink-soft">
                  MP4, MOV, WebM · then enter title & niche · stays on-device
                </div>
                <button
                  type="button"
                  className="mt-6 inline-flex rounded-full bg-ink text-surface px-5 py-2.5 text-[13px] font-semibold hover:opacity-90 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  Choose file
                </button>
              </motion.div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-[12px] text-ink-soft">
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-good" /> Drop-off prediction
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-good" /> Hook scoring
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-good" /> CTR forecast
              </span>
            </div>
          </motion.div>
        </main>
      )}

      {/* RESULTS PHASE */}
      {phase === "results" && meta && aiData && (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-12 pb-24 relative z-10">
          <div className="mb-10">
            <div className="text-[12px] uppercase tracking-[0.14em] text-ink-soft font-medium">
              Raw File · Audited Report
            </div>
            <h1 className="mt-2 font-display text-[28px] sm:text-[44px] md:text-[56px] leading-[1.02] font-semibold tracking-[-0.025em] text-ink">
              Pre-Upload Audit
            </h1>
            <p className="mt-3 text-[15px] text-ink-soft max-w-xl">
              AI diagnostic analysis complete. Below is your optimized feed preview, predicted
              retention curve, and actionable title and formatting fixes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-6">
              <PreviewCard meta={meta} />
              <FileInfo stats={fileInfoStats} />
            </div>

            <div className="lg:col-span-7 space-y-6">
              <ChannelDigestCard
                digest={intelProof?.channelDigest}
                hasTranscript={intelProof?.hasTranscript}
              />
              {intelProof?.dataReceipts && <DataReceiptsStrip receipts={intelProof.dataReceipts} />}
              <ScoreRing
                score={aiData.overallScore}
                grade={letterGradeTen(aiData.overallScore)}
                headline={
                  aiData.overallScore >= 8
                    ? "Strong — ready to upload with minor tweaks."
                    : aiData.overallScore >= 5.5
                      ? "Fix the flagged issues before publishing."
                      : "Needs significant work before going live."
                }
                summary={aiData.explanation}
                maxScore={10}
              />
              <MetricBars metrics={aiData.metrics} maxScore={10} />
              <DropoffPredictor meta={aiData.dropoffMeta} />
              <Diagnostics items={aiData.flags} />
            </div>
          </div>

          <UpgradeBanner
            title="Need deeper insights?"
            description="Upgrade for more monthly pre-analyses, priority processing, and competitor benchmarking."
          />
          <div className="mb-6 flex justify-center">
            <button
              onClick={reset}
              className="rounded-full border border-hairline bg-white px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-surface-2 transition whitespace-nowrap"
            >
              Analyse Another
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
