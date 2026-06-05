import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createServerFn } from "@tanstack/react-start";
import { loadChannelIntel, saveChannelIntel } from "@/lib/channel-session";
import { ChannelDigestCard, DataReceiptsStrip } from "@/components/intel/ChannelDigestCard";
import { runNicheRanker } from "@/lib/youtube/niche-ranker-server";
import { addActivity, saveResult, loadResult } from "@/lib/activity";
import { hasCredits, deductCredit } from "@/lib/credits";
import { recordUsage } from "@/lib/usage";
import { extractNicheFeatures } from "@/lib/ml/niche-features";
import type { NicheFeatures } from "@/lib/ml/niche-features";
import { collectTrainingData, queueTrainingRecord } from "@/lib/ml/training-collector";
import { TrendingUp, TrendingDown, Minus, ArrowRight, Zap, Shield, DollarSign, Target, Flame, Compass, ThumbsUp, ThumbsDown } from "lucide-react";

export const Route = createFileRoute("/niche-ranker")({
  validateSearch: (s: Record<string, unknown>) => ({
    channel: typeof s.channel === "string" ? s.channel : undefined,
    activityId: typeof s.activityId === "string" ? s.activityId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Niche Ranker — Viraleo" },
      { name: "description", content: "Discover the best YouTube niches for growth. AI-powered saturation analysis, trend velocity, CPM estimates, and breakthrough difficulty scoring." },
      { property: "og:title", content: "Niche Ranker — Viraleo" },
      { property: "og:description", content: "Discover the best YouTube niches. AI-powered saturation, trends, and CPM analysis." },
      { property: "og:image", content: "https://viraleo.pro/vi-logo.png" },
      { property: "og:url", content: "https://viraleo.pro/niche-ranker" },
      { name: "twitter:title", content: "Niche Ranker — Viraleo" },
      { name: "twitter:description", content: "Find the best YouTube niches for growth." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/niche-ranker" }],
  }),
  component: NicheRankerPage,
});

export const rankNicheServer = createServerFn({ method: "POST" })
  .inputValidator((d: { niche: string, format: "long" | "short" }) => d)
  .handler(async ({ data }) => JSON.parse(JSON.stringify(await runNicheRanker(data.niche, data.format))));

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-emerald-500", "A": "text-emerald-400", "B": "text-blue-500",
  "C": "text-amber-500", "D": "text-orange-500", "F": "text-red-500"
};
const GRADE_BG: Record<string, string> = {
  "A+": "bg-emerald-50 border-emerald-200", "A": "bg-emerald-50 border-emerald-200",
  "B": "bg-blue-50 border-blue-200", "C": "bg-amber-50 border-amber-200",
  "D": "bg-orange-50 border-orange-200", "F": "bg-red-50 border-red-200"
};

function TrendIcon({ dir }: { dir: string }) {
  if (dir === "Rising") return <TrendingUp size={16} className="text-emerald-500" />;
  if (dir === "Declining") return <TrendingDown size={16} className="text-red-500" />;
  return <Minus size={16} className="text-amber-500" />;
}

function ScoreBar({ score, color = "bg-good" }: { score: number; color?: string }) {
  return (
    <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden mt-2">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

const EXAMPLE_NICHES = ["Faceless true crime", "Budget tech reviews", "Minecraft redstone tutorials", "Keto meal prep", "Day trading psychology"];

function NicheRankerPage() {
  const { channel: channelParam, activityId: activityIdParam } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "results">("idle");
  const [data, setData] = useState<any>(null);
  const [contentFormat, setContentFormat] = useState<"long" | "short">("long");
  const [nicheFeatures, setNicheFeatures] = useState<NicheFeatures | null>(null);
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const analysisSteps = [
    "Searching YouTube data...",
    "Analyzing saturation levels...",
    "Measuring trend velocity...",
    "Calculating CPM estimates...",
    "Generating report...",
  ];

  useEffect(() => {
    if (activityIdParam) {
      const cached = loadResult(activityIdParam);
      if (cached) {
        setData(cached);
        setPhase("results");
        return;
      }
    }
  }, [activityIdParam]);

  // Looping Placeholder Logic
  const placeholders = [
    "Input reference video/short URL...",
    "Enter a niche idea (e.g. Budget Tech)...",
    "Paste a competitor's link..."
  ];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // Using a simple interval for placeholder rotation
  // Using a simple interval for placeholder rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  useEffect(() => {
    if (channelParam && !query) {
      setQuery(channelParam.startsWith("@") ? channelParam : `@${channelParam}`);
    } else {
      const intel = loadChannelIntel();
      if (intel && !query) setQuery(intel.meta.handle || intel.queriedInput);
    }
  }, [channelParam, query]);

  const run = async (niche: string) => {
    if (!niche.trim()) return;
    if (!hasCredits()) {
      toast.error("You're out of credits for this month. Upgrade your plan to continue.");
      return;
    }

    const trimmed = niche.trim();
    const features = extractNicheFeatures(trimmed, contentFormat);
    setNicheFeatures(features);

    const cacheKey = `niche:${hashStr(trimmed.toLowerCase())}:${contentFormat}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setData(JSON.parse(cached));
        setPhase("results");
        return;
      } catch { /* corrupt cache */ }
    }

    setPhase("loading");
    setCurrentStep(0);
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % analysisSteps.length);
    }, 1600);
    try {
      const result = await rankNicheServer({ data: { niche: trimmed, format: contentFormat } });
      const { _intelBundle, ...report } = result as typeof result & {
        _intelBundle?: import("@/lib/youtube/types").ChannelIntelBundle;
      };
      if (_intelBundle) saveChannelIntel(_intelBundle);
      sessionStorage.setItem(cacheKey, JSON.stringify(report));
      setData(report);
      deductCredit();
      recordUsage("nicheRanker");
      const entry = addActivity("niche-ranker", trimmed);
      saveResult(entry.id, report);
      setPhase("results");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("YOUTUBE_API_KEY_REQUIRED")) {
        toast.error("YouTube API key is missing. Please set YOUTUBE_API_KEY in your .env file.");
      } else if (msg.includes("YOUTUBE_API_KEY_IS_OAUTH_CLIENT_ID")) {
        toast.error("The key in .env appears to be an OAuth Client ID instead of a YouTube Data API Key.");
      } else if (msg.includes("YOUTUBE_API_KEY_INVALID_FORMAT")) {
        toast.error("The YOUTUBE_API_KEY format is invalid. YouTube Data API keys start with 'AIzaSy'.");
      } else if (msg.includes("YOUTUBE_API_KEY_INVALID")) {
        toast.error("The YouTube Data API returned an 'API key not valid' error.");
      } else if (msg.includes("YOUTUBE_API_NOT_ENABLED")) {
        toast.error("The YouTube Data API v3 is not enabled in your Google Cloud project.");
      } else {
        toast.error(`Analysis failed: ${msg || "Unknown error"}. Please try again.`);
      }
      setPhase("idle");
    } finally {
      clearInterval(stepInterval);
    }
  };

  function onNicheFeedback(vote: "positive" | "negative") {
    setFeedback(vote);
    if (nicheFeatures && data) {
      const record = collectTrainingData(undefined, {
        markers: [],
        microMarkers: [],
        retentionCurve: [],
        lowerCurve: [],
        upperCurve: [],
        retentionAt: { five: 0, fifteen: 0, thirty: 0, sixty: 0, midpoint: 0, end: 0 },
        estimatedAvgViewDuration: 0,
        retentionGrade: "C",
        vsNicheAverage: 0,
      }, vote);
      (record as any).nicheFeatures = nicheFeatures;
      (record as any).llmScore = data.viabilityScore;
      (record as any).llmMetrics = [
        { label: "Saturation", score: data.metrics.saturation.score, copy: data.metrics.saturation.insight },
        { label: "Trend", score: data.metrics.trendVelocity.score, copy: data.metrics.trendVelocity.insight },
        { label: "CPM", score: data.metrics.cpmRange.max, copy: data.metrics.cpmRange.insight },
        { label: "Difficulty", score: data.metrics.breakthroughDifficulty.score, copy: data.metrics.breakthroughDifficulty.insight },
      ];
      queueTrainingRecord(record);
    }
  }

  const reset = () => { setPhase("idle"); setData(null); setQuery(""); setNicheFeatures(null); setFeedback(null); };

  return (
    <div className="min-h-screen bg-surface text-ink font-text relative overflow-x-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-good/8 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">

        {/* IDLE: Hero Input */}
        {phase === "idle" && (
          <motion.main
            key="idle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="relative z-10 max-w-3xl mx-auto px-6 pt-24 pb-32"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-good/10 border border-good/20 rounded-full px-4 py-1.5 text-good text-[12px] font-bold uppercase tracking-widest mb-6">
                <Compass size={12} />  Niche Intelligence Engine
              </div>
              <h1 className="font-display text-[52px] md:text-[64px] font-bold leading-[1.01] tracking-[-0.03em] text-ink mb-4">
                Is your niche<br />
                <span className="relative inline-block mt-2">
                  worth it?
                  <svg className="absolute w-[110%] h-6 -bottom-2 -left-[5%] z-[-1] pointer-events-none" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <motion.path 
                      d="M 5,15 Q 30,5 50,12 T 95,8" 
                      stroke="url(#rainbowGrad)" 
                      strokeWidth="3.5" 
                      fill="none" 
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
                    />
                    <defs>
                      <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ff4b4b" />
                        <stop offset="25%" stopColor="#ff9a00" />
                        <stop offset="50%" stopColor="#d0de21" />
                        <stop offset="75%" stopColor="#3fdad8" />
                        <stop offset="100%" stopColor="#8a2be2" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </h1>
              <p className="text-[16px] text-ink-soft max-w-md mx-auto">
                Enter any YouTube niche idea or paste a competitor's video link. Our AI will extract the niche and give you a brutally honest viability score.
              </p>
            </div>

            <div className="bg-surface border border-hairline rounded-[28px] shadow-[0_4px_60px_-20px_rgba(0,0,0,0.12)] overflow-hidden">
              <div className="flex items-center gap-4 px-6 py-5 border-b border-hairline bg-white/50 relative">
                <Compass size={20} className="text-ink-soft shrink-0" />
                <AnimatePresence mode="wait">
                  {!query && (
                    <motion.div
                      key={placeholderIdx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="absolute left-14 right-40 pointer-events-none text-ink-soft/60 text-[16px]"
                    >
                      {placeholders[placeholderIdx]}
                    </motion.div>
                  )}
                </AnimatePresence>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && run(query)}
                  className="flex-1 bg-transparent text-[16px] text-ink focus:outline-none relative z-10 w-full min-w-0"
                  autoFocus
                />
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => run(query)}
                  className="bg-ink text-surface font-semibold text-[14px] px-5 py-2.5 rounded-xl hover:opacity-90 transition flex items-center gap-2 shrink-0 z-10"
                >
                  Analyze <ArrowRight size={14} />
                </motion.button>
              </div>
              
              <div className="px-6 py-5 bg-surface-2/30 border-t border-hairline flex flex-col gap-4">
                {/* Format selection */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Target Format:</span>
                  <div className="flex bg-surface border border-hairline rounded-full p-0.5 shadow-sm">
                    <button 
                      onClick={() => setContentFormat('long')} 
                      className={`px-4 py-1 text-[11px] font-bold rounded-full transition-all ${contentFormat === 'long' ? 'bg-ink text-surface shadow-sm' : 'text-ink-soft hover:text-ink'}`}
                    >
                      Long-form
                    </button>
                    <button 
                      onClick={() => setContentFormat('short')} 
                      className={`px-4 py-1 text-[11px] font-bold rounded-full transition-all ${contentFormat === 'short' ? 'bg-ink text-surface shadow-sm' : 'text-ink-soft hover:text-ink'}`}
                    >
                      Shorts
                    </button>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="flex flex-wrap gap-2 items-center border-t border-hairline/40 pt-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Quick Ideas:</span>
                  {EXAMPLE_NICHES.map((n) => (
                    <button
                      key={n}
                      onClick={() => { setQuery(n); run(n); }}
                      className="text-[11px] font-medium px-3 py-1 rounded-full bg-surface border border-hairline text-ink-soft hover:text-ink hover:border-ink/20 transition shadow-sm"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.main>
        )}

        {/* LOADING */}
        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 cursor-none select-none"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-good/10 border border-good/20 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 rounded-full border-2 border-good/30 border-t-good"
                />
              </div>
            </div>
            <div className="text-center">
              <h2 className="font-display text-[24px] font-bold text-ink mb-1">Scanning the Market...</h2>
              <p className="text-[14px] text-ink-soft mb-1">{analysisSteps[currentStep]}</p>
              <p className="text-[12px] text-ink-soft/60">Analyzing "{query}"</p>
            </div>
          </motion.div>
        )}

        {/* RESULTS */}
        {phase === "results" && data && (
          <motion.main
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 max-w-[1300px] mx-auto px-6 pt-10 pb-24"
          >
            <ChannelDigestCard
              digest={data.channelDigest}
              hasTranscript={data.hasTranscript}
              className="mb-6"
            />
            {data.dataReceipts?.length > 0 && (
              <DataReceiptsStrip receipts={data.dataReceipts} />
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-10 gap-4 flex-wrap mt-6">
              <div>
                <button onClick={reset} className="text-[12px] font-semibold text-ink-soft hover:text-ink uppercase tracking-widest mb-3 flex items-center gap-1.5 transition">
                  ← New Analysis
                </button>
                <h1 className="font-display text-[40px] font-bold tracking-tight text-ink leading-tight">{data.nicheName}</h1>
                <p className="text-[16px] text-ink-soft mt-1">{data.tagline}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className={`flex flex-col items-center justify-center rounded-[20px] border-2 px-8 py-4 shrink-0 ${GRADE_BG[data.overallGrade] || "bg-surface-2 border-hairline"}`}>
                  <div className={`font-display text-[52px] font-black leading-none ${GRADE_COLORS[data.overallGrade] || "text-ink"}`}>{data.overallGrade}</div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-ink-soft mt-1">Viability Grade</div>
                </div>
                <div className="flex flex-col gap-1.5 pt-2">
                  <button onClick={() => onNicheFeedback("positive")} className={`size-7 rounded-full flex items-center justify-center transition-all ${feedback === "positive" ? "bg-good/15 text-good" : "text-ink-soft hover:bg-surface-2"}`} title="Accurate analysis"><ThumbsUp size={14} /></button>
                  <button onClick={() => onNicheFeedback("negative")} className={`size-7 rounded-full flex items-center justify-center transition-all ${feedback === "negative" ? "bg-critical/15 text-critical" : "text-ink-soft hover:bg-surface-2"}`} title="Inaccurate analysis"><ThumbsDown size={14} /></button>
                </div>
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

              {/* Left Column: Metrics */}
              <div className="xl:col-span-8 space-y-6">

                {/* 4-Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      icon: Shield, label: "Saturation", value: `${data.metrics.saturation.label}`,
                      sub: `${data.metrics.saturation.score}/100`, color: data.metrics.saturation.score > 70 ? "text-red-500" : "text-emerald-500",
                      barColor: data.metrics.saturation.score > 70 ? "bg-red-400" : "bg-good", score: data.metrics.saturation.score
                    },
                    {
                      icon: TrendingUp, label: "Trend", value: data.metrics.trendVelocity.direction,
                      sub: `${data.metrics.trendVelocity.score}/100`, color: data.metrics.trendVelocity.direction === "Rising" ? "text-emerald-500" : data.metrics.trendVelocity.direction === "Declining" ? "text-red-500" : "text-amber-500",
                      barColor: data.metrics.trendVelocity.direction === "Rising" ? "bg-good" : "bg-amber-400", score: data.metrics.trendVelocity.score
                    },
                    {
                      icon: DollarSign, label: "Est. CPM", value: `$${data.metrics.cpmRange.min}–$${data.metrics.cpmRange.max}`,
                      sub: "per 1K views", color: "text-ink", barColor: "bg-blue-400",
                      score: Math.min(100, (data.metrics.cpmRange.max / 25) * 100)
                    },
                    {
                      icon: Flame, label: "Difficulty", value: data.metrics.breakthroughDifficulty.label,
                      sub: `${data.metrics.breakthroughDifficulty.score}/100`, color: data.metrics.breakthroughDifficulty.score > 70 ? "text-red-500" : "text-emerald-500",
                      barColor: data.metrics.breakthroughDifficulty.score > 70 ? "bg-red-400" : "bg-good", score: data.metrics.breakthroughDifficulty.score
                    }
                  ].map(({ icon: Icon, label, value, sub, color, barColor, score }) => (
                    <div key={label} className="bg-surface border border-hairline rounded-[20px] p-5 hover:shadow-md hover:border-ink/10 transition-all">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon size={14} className="text-ink-soft" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">{label}</span>
                      </div>
                      <div className={`font-bold text-[20px] leading-tight ${color}`}>{value}</div>
                      <div className="text-[12px] text-ink-soft mt-0.5">{sub}</div>
                      <ScoreBar score={score} color={barColor} />
                    </div>
                  ))}
                </div>

                {/* Deep Dive Insights */}
                <div className="bg-surface border border-hairline rounded-[24px] p-6 hover:border-ink/10 transition-all">
                  <h2 className="font-semibold text-ink text-[18px] mb-5">Deep Dive Analysis</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[
                      { title: "Saturation", insight: data.metrics.saturation.insight, score: data.metrics.saturation.score, barColor: data.metrics.saturation.score > 70 ? "bg-red-400" : "bg-good" },
                      { title: "Trend Velocity", insight: data.metrics.trendVelocity.insight, score: data.metrics.trendVelocity.score, barColor: "bg-blue-400" },
                      { title: "Revenue Potential", insight: data.metrics.cpmRange.insight, score: Math.min(100, (data.metrics.cpmRange.max / 25) * 100), barColor: "bg-emerald-400" },
                      { title: "Breakthrough Difficulty", insight: data.metrics.breakthroughDifficulty.insight, score: data.metrics.breakthroughDifficulty.score, barColor: data.metrics.breakthroughDifficulty.score > 70 ? "bg-red-400" : "bg-good" },
                    ].map(({ title, insight, score, barColor }) => (
                      <div key={title} className="bg-surface-2 rounded-[16px] p-4 border border-hairline">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[13px] font-bold text-ink">{title}</span>
                          <span className="text-[13px] font-bold text-ink-soft">{Math.round(score)}/100</span>
                        </div>
                        <ScoreBar score={score} color={barColor} />
                        <p className="text-[13px] text-ink-soft mt-3 leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths & Warnings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-[24px] p-6">
                    <h3 className="font-bold text-emerald-700 text-[14px] uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={14}/> Strengths</h3>
                    <ul className="space-y-2.5">
                      {data.strengths.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 text-[14px] text-emerald-800">
                          <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-[11px] font-bold text-emerald-600 shrink-0">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-[24px] p-6">
                    <h3 className="font-bold text-red-700 text-[14px] uppercase tracking-widest mb-4 flex items-center gap-2"><Shield size={14}/> Warnings</h3>
                    <ul className="space-y-2.5">
                      {data.warnings.map((w: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 text-[14px] text-red-800">
                          <span className="mt-0.5 w-5 h-5 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-[11px] font-bold text-red-600 shrink-0">!</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right Column: Pivots & Audience */}
              <div className="xl:col-span-4 space-y-6">

                {/* Smart Pivots */}
                <div className="bg-surface border border-hairline rounded-[24px] p-6 hover:border-ink/10 transition-all">
                  <div className="flex items-center gap-2 mb-5">
                    <Target size={16} className="text-ink-soft" />
                    <h2 className="font-semibold text-ink text-[16px]">Smarter Pivots</h2>
                  </div>
                  <p className="text-[13px] text-ink-soft mb-5">Don't go broad. These sub-niches give you a better shot at breaking through.</p>
                  <div className="space-y-3">
                    {data.pivots.map((p: any, i: number) => (
                      <div key={i} className={`rounded-[16px] border p-4 ${GRADE_BG[p.grade] || "bg-surface-2 border-hairline"}`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="font-bold text-[14px] text-ink leading-tight">{p.subNiche}</span>
                          <span className={`text-[12px] font-black shrink-0 ${GRADE_COLORS[p.grade] || "text-ink"}`}>{p.grade}</span>
                        </div>
                        <p className="text-[12px] text-ink-soft leading-relaxed">{p.why}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ideal Audience */}
                <div className="bg-surface border border-hairline rounded-[24px] p-6 hover:border-ink/10 transition-all">
                  <h2 className="font-semibold text-ink text-[16px] mb-3">Ideal Audience</h2>
                  <p className="text-[14px] text-ink-soft leading-relaxed">{data.idealAudience}</p>
                </div>

                {/* Top Formats */}
                <div className="bg-surface border border-hairline rounded-[24px] p-6 hover:border-ink/10 transition-all">
                  <h2 className="font-semibold text-ink text-[16px] mb-4">Top Performing Formats</h2>
                  <div className="space-y-2">
                    {data.topFormats.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-surface-2 border border-hairline rounded-xl px-4 py-3">
                        <span className="text-[12px] font-bold text-ink-soft shrink-0">0{i + 1}</span>
                        <span className="text-[14px] font-medium text-ink">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
