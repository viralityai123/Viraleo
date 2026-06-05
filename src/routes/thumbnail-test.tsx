import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createServerFn } from "@tanstack/react-start";
import { normalizeChannelInput } from "@/lib/channel-session";
import { letterGradeTen } from "@/lib/score-scale";
import { runThumbnailTest } from "@/lib/youtube/thumbnail-test-server";
import { addActivity, saveResult, loadResult } from "@/lib/activity";
import { hasCredits, deductCredit } from "@/lib/credits";
import { recordUsage } from "@/lib/usage";
import { extractThumbnailFeatures } from "@/lib/ml/thumbnail-features";
import type { ThumbnailFeatures } from "@/lib/ml/thumbnail-types";
import { thumbnailScoreMl } from "@/lib/ml/thumbnail-score-server";
import { collectTrainingData, queueTrainingRecord } from "@/lib/ml/training-collector";

import { ViraleoLogo } from "@/components/ViraleoLogo";
import { Header } from "@/components/pre-analysis/Header";
import { ScoreRing } from "@/components/pre-analysis/ScoreRing";
import { MetricBars } from "@/components/pre-analysis/MetricBars";
import { Play, Menu, Search as SearchIcon, Sun, Moon, LayoutGrid, ListMinus, Smartphone, ThumbsUp, ThumbsDown } from "lucide-react";
import { ChannelDigestCard, DataReceiptsStrip } from "@/components/intel/ChannelDigestCard";

export const Route = createFileRoute("/thumbnail-test")({
  validateSearch: (s: Record<string, unknown>) => ({
    channel:
      typeof s.channel === "string" ? normalizeChannelInput(s.channel) : undefined,
    activityId: typeof s.activityId === "string" ? s.activityId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Thumbnail Simulator — Viraleo" },
      { name: "description", content: "Test YouTube thumbnails with AI. Score your thumbnail design, compare variants, and predict CTR before you upload." },
      { property: "og:title", content: "Thumbnail Simulator — Viraleo" },
      { property: "og:description", content: "Test YouTube thumbnails with AI. Score designs, compare variants, predict CTR." },
      { property: "og:image", content: "https://viraleo.pro/vi-logo.png" },
      { property: "og:url", content: "https://viraleo.pro/thumbnail-test" },
      { name: "twitter:title", content: "Thumbnail Simulator — Viraleo" },
      { name: "twitter:description", content: "Test YouTube thumbnails with AI." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/thumbnail-test" }],
  }),
  component: ThumbnailTestPage,
});

// ─── Real Multimodal AI Server Function ──────────────────────────────────────────
export const analyzeThumbnailServer = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      base64: string;
      title: string;
      context: string;
      isShort: boolean;
      compareToCompetitor?: boolean;
      channelQuery?: string;
      variantLabel?: "A" | "B";
    }) => d
  )
  .handler(async ({ data }) => runThumbnailTest(data));

// ─── High-fidelity Mock Data for Feed Preview ─────────────────────────────────
const MOCK_LONG = [
  { id: 1, title: "I Built a Secret Room in My House!", channel: "MrBeast", views: "45M", time: "2 days ago", img: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=640&h=360&fit=crop", color: "bg-blue-600" },
  { id: 2, title: "100 Days Building a Modern Cabin", channel: "Cabin Life", views: "2.1M", time: "1 week ago", img: "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=640&h=360&fit=crop", color: "bg-emerald-600" },
  { id: 3, title: "Testing Viral TikTok Gadgets", channel: "TechReview", views: "850K", time: "3 days ago", img: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=640&h=360&fit=crop", color: "bg-purple-600" },
  { id: 4, title: "How to perfectly roast a chicken", channel: "Chef's Kitchen", views: "1.2M", time: "1 month ago", img: "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=640&h=360&fit=crop", color: "bg-red-600" },
  { id: 5, title: "Ultimate Desk Setup 2024", channel: "Minimalist Tech", views: "450K", time: "2 weeks ago", img: "https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=640&h=360&fit=crop", color: "bg-indigo-600" }
];

const MOCK_SHORT = [
  { id: 1, title: "Satisfying pressure washing 💦", views: "12M", img: "https://images.unsplash.com/photo-1527264935190-1401c51b5bbc?w=360&h=640&fit=crop" },
  { id: 2, title: "I can't believe this worked! 🤯", views: "8.5M", img: "https://images.unsplash.com/photo-1616423640778-28d1b53229bd?w=360&h=640&fit=crop" },
  { id: 3, title: "Wait for the plot twist...", views: "3.2M", img: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=360&h=640&fit=crop" },
  { id: 4, title: "Coolest gadget ever? 📱", views: "5.1M", img: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=360&h=640&fit=crop" }
];

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function computeDeterministicScore(features: ThumbnailFeatures): number {
  const m = features.metricScores;
  return Math.min(10, Math.max(0, +((m.visualContrast + m.textReadability + m.topicRelevance + m.clickPsychology) / 4).toFixed(1)));
}

function makeHashKey(base64: string, title: string, context: string, format: string): string {
  return hashStr(base64.slice(0, 300) + title + context + format);
}

function ThumbnailTestPage() {
  const { channel: channelParam, activityId: activityIdParam } = Route.useSearch();
  const [phase, setPhase] = useState<"drop" | "setup" | "analyzing" | "results">("drop");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [format, setFormat] = useState<"long" | "short">("long");
  const [currentStep, setCurrentStep] = useState(0);
  const analysisSteps = [
    "Extracting visual features...",
    "Running face detection...",
    "Analyzing text readability...",
    "Scoring contrast & composition...",
    "Generating report...",
  ];
  
  // Customization fields for Preview & Server Model
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [channelName, setChannelName] = useState("Your Channel");
  const [compareCompetitor, setCompareCompetitor] = useState(false);
  const [competitorHandle, setCompetitorHandle] = useState("");
  
  // Intelligence AI Data
  const [aiData, setAiData] = useState<any>(null);

  // Layout & Theme View Controls
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [layoutMode, setLayoutMode] = useState<"grid" | "sidebar" | "mobile">("grid");

  // ML Feature Extraction
  const [thumbFeatures, setThumbFeatures] = useState<ThumbnailFeatures | null>(null);
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [cacheKey, setCacheKey] = useState<string | null>(null);

  // A/B Testing Data
  const [thumbUrlB, setThumbUrlB] = useState<string | null>(null);
  const [base64B, setBase64B] = useState<string | null>(null);
  const [aiDataB, setAiDataB] = useState<any>(null);
  const [thumbFeaturesB, setThumbFeaturesB] = useState<ThumbnailFeatures | null>(null);
  const [isAnalyzingB, setIsAnalyzingB] = useState(false);
  const inputRefB = useRef<HTMLInputElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activityIdParam) {
      const cached = loadResult(activityIdParam);
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
    if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    setPhase("drop");
    setProgress(0);
    setThumbUrl(null);
    setBase64(null);
    setTitle("");
    setContext("");
    setChannelName("Your Channel");
    setCompareCompetitor(false);
    setCompetitorHandle("");
    setAiData(null);
    setThumbFeatures(null);
    setFeedback(null);
    setCacheKey(null);
    setThumbUrlB(null);
    setBase64B(null);
    setAiDataB(null);
    setThumbFeaturesB(null);
  };

  const accept = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WebP).");
      return;
    }

    const url = URL.createObjectURL(f);
    setThumbUrl(url);

    const reader = new FileReader();
    reader.onloadend = () => {
      setBase64(reader.result as string);
    };
    reader.readAsDataURL(f);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      const isVertical = img.height > img.width;
      setFormat(isVertical ? "short" : "long");
      setPhase("setup");
    };
  }, []);

  useEffect(() => {
    if (!base64) return;
    const t = title || "Untitled";
    extractThumbnailFeatures(base64, t, format === "short").then((features) => {
      setThumbFeatures(features);
      // Check localStorage cache for deterministic score
      const ck = `thumb:det:${makeHashKey(base64, t, context, format)}`;
      setCacheKey(ck);
      const cached = localStorage.getItem(ck);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          setAiData(cachedData);
          setPhase("results");
        } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, [base64, format]);

  const runAnalysis = async () => {
    if (!base64 || !title || !context) {
      toast.error("Please enter a title and video context so the AI can rank your thumbnail's relevance.");
      return;
    }
    if (!hasCredits()) {
      toast.error("You're out of credits for this month. Upgrade your plan to continue.");
      return;
    }

    setPhase("analyzing");
    setCurrentStep(0);
    
    let p = 0;
    let stepIdx = 0;
    const interval = setInterval(() => {
      p += (95 - p) * 0.15;
      setProgress(p);
      stepIdx = Math.min(Math.floor(p / 20), analysisSteps.length - 1);
      setCurrentStep(stepIdx);
    }, 150);

    try {
      let llmResult: any = null;

      // ML router: Workers AI → Gemini fallback (LLM provides explanation + metrics copy)
      if (thumbFeatures) {
        const mlResult = await thumbnailScoreMl({
          data: {
            base64,
            features: thumbFeatures,
            title,
            context,
            isShort: format === "short",
          },
        });
        if (mlResult) {
          llmResult = mlResult;
          llmResult.modelVersion = "workers-ai-v1";
        }
      }

      // Fallback to Gemini
      if (!llmResult) {
        const geminiResult = await analyzeThumbnailServer({
          data: {
            base64,
            title,
            context,
            isShort: format === "short",
            compareToCompetitor: compareCompetitor && !!competitorHandle.trim(),
            channelQuery: compareCompetitor ? competitorHandle : undefined,
            variantLabel: "A",
          },
        });
        llmResult = geminiResult;
        if (llmResult) llmResult.modelVersion = "gemini-v1";
      }

      // Override with deterministic feature-based score
      const featureScore = thumbFeatures ? computeDeterministicScore(thumbFeatures) : (llmResult?.overallScore ?? 5);
      const result = {
        ...llmResult,
        overallScore: featureScore,
        predictedCtr: thumbFeatures?.predictedCtr ?? llmResult?.ctrEstimate ?? 0.045,
      };

      setAiData(result);

      // Persist to localStorage cache
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      }

      deductCredit();
      recordUsage("thumbnailTest");
      const entry = addActivity("thumbnail-test", title, channelName || undefined);
      saveResult(entry.id, result);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || String(err);
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
        toast.error(`AI analysis failed: ${msg || "Unknown error"}.`);
      }
    } finally {
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => setPhase("results"), 400);
    }
  };

  const acceptB = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    const url = URL.createObjectURL(f);
    setThumbUrlB(url);
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setBase64B(b64);
      setIsAnalyzingB(true);

      // Extract features for deterministic scoring
      extractThumbnailFeatures(b64, title || "Untitled", format === "short").then(async (features) => {
        setThumbFeaturesB(features);
        const score = computeDeterministicScore(features);

        // Get LLM explanation for copy text
        let llmResult: any = null;
        try {
          const mlResult = await thumbnailScoreMl({
            data: { base64: b64, features, title, context, isShort: format === "short" },
          });
          if (mlResult) {
            llmResult = mlResult;
          }
        } catch {}

        if (!llmResult) {
          try {
            llmResult = await analyzeThumbnailServer({
              data: {
                base64: b64, title, context, isShort: format === "short",
                compareToCompetitor: compareCompetitor && !!competitorHandle.trim(),
                channelQuery: compareCompetitor ? competitorHandle : undefined,
                variantLabel: "B",
              },
            });
          } catch {}
        }

        setAiDataB({
          ...(llmResult || {}),
          overallScore: score,
          predictedCtr: features.predictedCtr,
        });
      }).catch(() => {
        // Fallback: just score what we can
        setAiDataB({
          overallScore: 5,
          predictedCtr: 0.045,
          explanation: "Could not extract visual features from this image.",
          metrics: [],
        });
      }).finally(() => {
        setIsAnalyzingB(false);
      });
    };
    reader.readAsDataURL(f);
  }, [title, context, format, compareCompetitor, competitorHandle]);

  const isDark = theme === "dark";

  function onFeedback(vote: "positive" | "negative") {
    setFeedback(vote);
    if (thumbFeatures && aiData) {
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
      (record as any).thumbnailFeatures = thumbFeatures;
      (record as any).llmScore = aiData.overallScore;
      (record as any).llmMetrics = aiData.metrics;
      queueTrainingRecord(record);
    }
  }

  const renderLongItem = (mock: any, isUser: boolean) => {
    const finalTitle = isUser ? (title || "Your Video Title") : mock.title;
    const finalChannel = isUser ? (channelName || "Your Channel") : mock.channel;
    const finalViews = isUser ? "— views" : mock.views;
    const finalTime = isUser ? "Just now" : mock.time;
    const finalImg = isUser ? thumbUrl : mock.img;
    
    const cardBorder = isUser ? "border-[2px] border-good shadow-[0_0_20px_rgba(61,220,107,0.15)] ring-2 ring-good/20 z-10 relative" : (isDark ? "bg-[#222]" : "bg-gray-200");
    
    if (layoutMode === "grid") {
      return (
        <div key={isUser ? 'user' : mock.id} className="flex flex-col cursor-pointer group">
          <div className={`relative aspect-video rounded-xl overflow-hidden ${cardBorder}`}>
            <img src={finalImg!} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Thumbnail" />
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">14:20</div>
          </div>
          <div className="flex gap-3 mt-3">
            <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-bold text-white ${isUser ? 'bg-good text-ink' : mock.color}`}>
              {isUser ? (channelName ? channelName.charAt(0).toUpperCase() : "Y") : ""}
            </div>
            <div className="flex flex-col">
              <h3 className={`font-semibold text-[15px] leading-tight line-clamp-2 mb-1 ${isDark ? 'text-[#f1f1f1]' : 'text-[#0f0f0f]'}`}>{finalTitle}</h3>
              <div className={`text-[13px] leading-tight ${isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'}`}>{finalChannel}<br/>{finalViews} • {finalTime}</div>
            </div>
          </div>
        </div>
      );
    }
    
    if (layoutMode === "sidebar") {
      return (
        <div key={isUser ? 'user' : mock.id} className="flex gap-2 cursor-pointer group items-start">
          <div className={`relative w-[168px] shrink-0 aspect-video rounded-xl overflow-hidden ${cardBorder}`}>
            <img src={finalImg!} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Thumbnail" />
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">14:20</div>
          </div>
          <div className="flex flex-col py-0.5">
            <h3 className={`font-semibold text-[14px] leading-tight line-clamp-2 mb-1 ${isDark ? 'text-[#f1f1f1]' : 'text-[#0f0f0f]'}`}>{finalTitle}</h3>
            <div className={`text-[12px] leading-tight ${isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'}`}>{finalChannel}<br/>{finalViews} • {finalTime}</div>
          </div>
        </div>
      );
    }
  
    if (layoutMode === "mobile") {
      return (
        <div key={isUser ? 'user' : mock.id} className="flex flex-col cursor-pointer group w-full">
          <div className={`relative w-full aspect-video ${cardBorder} ${!isUser ? (isDark ? 'border-none rounded-none border-b border-[#303030]' : 'border-none rounded-none border-b border-gray-200') : ''}`}>
            <img src={finalImg!} className="w-full h-full object-cover" alt="Thumbnail" />
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[12px] font-medium px-1.5 py-0.5 rounded">14:20</div>
          </div>
          <div className="flex gap-3 p-4">
            <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-white ${isUser ? 'bg-good text-ink' : mock.color}`}>
              {isUser ? (channelName ? channelName.charAt(0).toUpperCase() : "Y") : ""}
            </div>
            <div className="flex flex-col justify-center">
              <h3 className={`font-semibold text-[16px] leading-tight line-clamp-2 mb-1 ${isDark ? 'text-[#f1f1f1]' : 'text-[#0f0f0f]'}`}>{finalTitle}</h3>
              <div className={`text-[13px] leading-tight ${isDark ? 'text-[#aaaaaa]' : 'text-[#606060]'}`}>{finalChannel} • {finalViews} • {finalTime}</div>
            </div>
          </div>
        </div>
      );
    }
  };

  const longMocksSequence: any[] = [MOCK_LONG[0], {isUser: true}, MOCK_LONG[1], MOCK_LONG[2], MOCK_LONG[3], MOCK_LONG[4]];

  return (
    <div className="min-h-screen bg-surface text-ink font-text relative overflow-x-hidden">
      
      {phase === "drop" && (
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-40 -left-40 size-[520px] rounded-full bg-good/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 size-[520px] rounded-full bg-watch/10 blur-3xl" />
        </div>
      )}

      {(phase === "setup" || phase === "analyzing" || phase === "results") && <Header onReset={reset} />}

      {/* PHASE 1: DROPZONE */}
      {phase === "drop" && (
        <main className="relative mx-auto max-w-3xl px-6 pt-24 pb-24 z-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="flex justify-center mb-4">
              <ViraleoLogo linkTo="/pre-analysis" size="xl" showText={false} />
            </div>
            <div className="text-[12px] uppercase tracking-[0.14em] text-ink-soft font-medium">Visual Intelligence</div>
            <h1 className="mt-3 font-display text-[44px] md:text-[56px] leading-[1.02] font-semibold tracking-[-0.025em] text-ink">
              Test your thumbnail.
            </h1>
            <p className="mt-3 text-[15px] text-ink-soft max-w-md mx-auto">
              Drop your image to instantly simulate live feed layouts and run a full AI Vision scan against your video's topic.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) accept(f); }}
              onClick={() => !base64 && inputRef.current?.click()}
              className={`relative ${!base64 ? "cursor-pointer" : ""} rounded-[28px] border bg-surface p-12 text-center transition-all duration-300 ${
                dragging ? "border-good shadow-[0_30px_80px_-30px_rgba(0,80,40,0.35)] scale-[1.01]" : "border-hairline shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_60px_-30px_rgba(0,0,0,0.15)] hover:border-ink/20"
              }`}
            >
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) accept(f); }} />
              <AnimatePresence mode="wait">
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.div
                    animate={{ y: dragging ? -4 : 0, scale: dragging ? 1.05 : 1 }}
                    className="mx-auto size-16 rounded-2xl bg-surface-2 border border-hairline flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-7 text-ink"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" /></svg>
                  </motion.div>
                  <div className="mt-5 font-display text-[20px] font-semibold tracking-tight text-ink">
                    {dragging ? "Release to continue" : "Drop or drag your thumbnail here"}
                  </div>
                  <div className="mt-1.5 text-[13px] text-ink-soft">JPG, PNG, WebP · 16:9 or 9:16 automatically detected</div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </main>
      )}

      {/* PHASE 2: SETUP */}
      {phase === "setup" && (
        <main className="relative mx-auto max-w-3xl px-6 pt-12 pb-24 z-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="font-display text-[36px] font-bold text-ink">Provide Context</h1>
            <p className="text-[15px] text-ink-soft">Tell the AI what the video is about so it can rank visual relevance.</p>
          </motion.div>
          <div className="bg-surface border border-hairline rounded-[28px] p-8 shadow-xl flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/2 flex flex-col gap-2">
              <div className="text-[13px] uppercase tracking-widest text-ink-soft font-semibold mb-1">Detected Upload</div>
              <div className={`relative w-full rounded-2xl overflow-hidden bg-surface-2 border border-hairline ${format === 'short' ? 'aspect-[9/16] max-w-[200px] mx-auto' : 'aspect-video'}`}>
                <img src={thumbUrl!} className="w-full h-full object-cover" alt="Uploaded Thumbnail" />
              </div>
            </div>
            <div className="w-full md:w-1/2 flex flex-col gap-5 justify-center">
              <div>
                <label className="text-[13px] font-semibold text-ink-soft mb-2 block">Video Title</label>
                <input type="text" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-surface-2 border border-hairline rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-good transition" placeholder="e.g. I Spent 100 Days in Minecraft" />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-ink-soft mb-2 block">Niche / topic</label>
                <input
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="w-full bg-surface-2 border border-hairline rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-good transition"
                  placeholder="e.g. Minecraft challenge, tech reviews, fitness"
                />
              </div>
              <label className="flex items-start gap-2 text-[12px] text-ink-soft cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareCompetitor}
                  onChange={(e) => setCompareCompetitor(e.target.checked)}
                  className="mt-0.5"
                />
                <span>Optionally compare to a competitor channel (off by default)</span>
              </label>
              {compareCompetitor && (
                <input
                  type="text"
                  value={competitorHandle}
                  onChange={(e) => setCompetitorHandle(e.target.value)}
                  className="w-full bg-surface-2 border border-hairline rounded-xl px-4 py-2.5 text-[13px] text-ink"
                  placeholder="Competitor handle e.g. dashmc"
                />
              )}
              <button onClick={runAnalysis} className="w-full bg-ink text-surface font-semibold py-3.5 rounded-xl hover:opacity-90 transition shadow-lg mt-2">
                Run AI Intelligence Scan
              </button>
            </div>
          </div>
        </main>
      )}

      {/* PHASE 3: ANALYZING */}
      {phase === "analyzing" && (
        <main className="relative mx-auto max-w-sm px-6 pt-32 pb-24 z-10 text-center cursor-none select-none">
          <div className="mx-auto size-20 rounded-3xl bg-good/15 border border-good/30 flex items-center justify-center mb-6">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="size-8 rounded-full border-2 border-good/30 border-t-good" />
          </div>
          <h2 className="font-display text-[24px] font-bold text-ink mb-2">Analyzing Visuals...</h2>
          <p className="text-[14px] text-ink-soft mb-2">{analysisSteps[currentStep]}</p>
          <p className="text-[12px] text-ink-soft/60 mb-6">Multimodal AI is extracting objects, reading text, and checking safe zones.</p>
          <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-good transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
        </main>
      )}

      {/* PHASE 4: RESULTS */}
      {phase === "results" && aiData && (
        <main className="mx-auto max-w-[1400px] px-6 pt-8 pb-24 relative z-10">
          <ChannelDigestCard
            digest={aiData.channelDigest}
            hasTranscript={aiData.hasTranscript}
            className="mb-4"
          />
          {aiData.dataReceipts?.length > 0 && (
            <div className="mb-6">
              <DataReceiptsStrip receipts={aiData.dataReceipts} />
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
            
            {/* Left Side: Mock Feed */}
            <div className="xl:col-span-8 flex flex-col order-2 xl:order-1">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
                <div>
                  <h2 className="font-display text-[32px] font-bold text-ink">Feed Simulation</h2>
                  <p className="text-ink-soft text-[15px] mt-1">Exactly how your {format === 'short' ? 'Short' : 'video'} will look next to competitors.</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {format === 'long' && (
                    <div className="flex bg-surface-2 border border-hairline rounded-lg p-1 shrink-0 hidden sm:flex">
                      <button onClick={() => setLayoutMode('grid')} className={`px-3 py-1.5 text-[12px] font-semibold rounded-md flex items-center gap-1.5 transition ${layoutMode === 'grid' ? 'bg-surface text-ink shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'text-ink-soft hover:text-ink'} `}><LayoutGrid size={14}/> Grid</button>
                      <button onClick={() => setLayoutMode('sidebar')} className={`px-3 py-1.5 text-[12px] font-semibold rounded-md flex items-center gap-1.5 transition ${layoutMode === 'sidebar' ? 'bg-surface text-ink shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'text-ink-soft hover:text-ink'} `}><ListMinus size={14}/> Sidebar</button>
                      <button onClick={() => setLayoutMode('mobile')} className={`px-3 py-1.5 text-[12px] font-semibold rounded-md flex items-center gap-1.5 transition ${layoutMode === 'mobile' ? 'bg-surface text-ink shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'text-ink-soft hover:text-ink'} `}><Smartphone size={14}/> Mobile</button>
                    </div>
                  )}
                  <div className="flex bg-surface-2 border border-hairline rounded-lg p-1 shrink-0">
                    <button onClick={() => setTheme('light')} className={`px-3 py-1.5 text-[13px] font-semibold rounded-md flex items-center gap-2 transition ${theme === 'light' ? 'bg-surface text-ink shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'text-ink-soft hover:text-ink'}`}><Sun size={14}/></button>
                    <button onClick={() => setTheme('dark')} className={`px-3 py-1.5 text-[13px] font-semibold rounded-md flex items-center gap-2 transition ${theme === 'dark' ? 'bg-ink text-surface shadow-[0_2px_8px_rgba(0,0,0,0.15)]' : 'text-ink-soft hover:text-ink'}`}><Moon size={14}/></button>
                  </div>
                </div>
              </div>

              {/* Simulated YouTube Window */}
              <div className={`w-full rounded-[24px] overflow-hidden border ${isDark ? 'border-[#303030] bg-[#0F0F0F]' : 'border-hairline bg-[#F9F9F9]'} transition-colors duration-300 pb-16 shadow-2xl relative`}>
                
                {/* Header Mock */}
                <div className={`flex items-center justify-between px-6 py-4 ${isDark ? 'text-white border-b border-[#303030]' : 'text-black border-b border-gray-200'} ${layoutMode === 'mobile' && format === 'long' ? 'hidden' : ''}`}>
                  <div className="flex items-center gap-5">
                    <Menu size={22} className={isDark ? 'text-gray-200' : 'text-gray-700'} />
                    <div className="flex items-center gap-1 font-bold text-[22px] tracking-tighter">
                      <div className="w-8 h-5.5 bg-red-600 rounded-[6px] flex items-center justify-center"><Play size={11} fill="white" className="text-white ml-0.5" /></div>
                      YouTube
                    </div>
                  </div>
                  <div className="hidden md:flex flex-1 max-w-xl mx-12">
                    <div className={`flex items-center w-full rounded-full border ${isDark ? 'border-[#303030] bg-[#121212]' : 'border-gray-300 bg-white'} overflow-hidden h-10`}>
                      <div className={`flex-1 px-5 font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Search</div>
                      <div className={`px-5 h-full flex items-center justify-center border-l ${isDark ? 'border-[#303030] bg-[#222222]' : 'border-gray-300 bg-gray-50'}`}><SearchIcon size={18} className={isDark ? 'text-gray-400' : 'text-gray-600'} /></div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">C</div>
                </div>

                {/* Long-form Rendering */}
                {format === 'long' && (
                  <div className={`
                    ${layoutMode === 'grid' ? "p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10" : ""}
                    ${layoutMode === 'sidebar' ? "p-6 md:p-8 flex flex-col gap-3 w-full max-w-[420px]" : ""}
                    ${layoutMode === 'mobile' ? "flex flex-col w-full max-w-[480px] mx-auto bg-black sm:my-10 sm:rounded-[32px] sm:border border-[#303030] overflow-hidden min-h-[800px]" : ""}
                  `}>
                    {layoutMode === 'mobile' && (
                       <div className="flex items-center justify-between px-4 py-4 text-white border-b border-[#303030]">
                         <div className="flex items-center gap-1 font-bold text-[20px] tracking-tighter"><div className="w-7 h-5 bg-red-600 rounded-[6px] flex items-center justify-center"><Play size={10} fill="white" className="text-white ml-0.5" /></div>YouTube</div>
                         <SearchIcon size={20} className="text-white" />
                       </div>
                    )}
                    {longMocksSequence.map((m: any, i) => renderLongItem(m.isUser ? {} : m, !!m.isUser))}
                  </div>
                )}

                {/* Shorts Rendering */}
                {format === 'short' && (
                  <div className="p-6 md:p-8">
                    <div className={`font-bold text-xl mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
                      <div className="w-6 h-6 flex items-center justify-center bg-red-600 rounded"><Play size={14} fill="white" className="text-white ml-0.5" /></div>
                      Shorts
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      
                      {/* User Short */}
                      <div className="flex flex-col cursor-pointer group">
                        <div className={`relative aspect-[9/16] rounded-xl overflow-hidden border-[2px] border-good shadow-[0_0_20px_rgba(61,220,107,0.15)] ring-2 ring-good/20 z-10`}>
                          <img src={thumbUrl || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Your Upload" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>
                          <div className="absolute bottom-3 left-3 right-3 text-white">
                            <div className="font-semibold text-[14px] line-clamp-2 mb-1 leading-[1.2] text-white" style={{textShadow: "0 2px 4px rgba(0,0,0,0.8)"}}>{title || "Your Short Title"}</div>
                            <div className="text-[12px] text-gray-300 font-medium">— views</div>
                          </div>
                        </div>
                      </div>

                      {MOCK_SHORT.map((mock, idx) => (
                        <div key={mock.id} className={`flex flex-col cursor-pointer group ${idx > 2 ? 'hidden lg:flex' : ''}`}>
                          <div className={`relative aspect-[9/16] rounded-xl overflow-hidden ${isDark ? 'bg-[#222]' : 'bg-gray-200'}`}>
                            <img src={mock.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Mock" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>
                            <div className="absolute bottom-3 left-3 right-3 text-white">
                              <div className="font-semibold text-[14px] line-clamp-2 mb-1 leading-[1.2] text-white" style={{textShadow: "0 2px 4px rgba(0,0,0,0.8)"}}>{mock.title}</div>
                              <div className="text-[12px] text-gray-300 font-medium">{mock.views} views</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Bottom-Left Optimization Section: CTR & A/B Testing */}
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                
                {/* Predicted CTR Benchmark */}
                <div className="bg-surface border border-hairline rounded-[24px] p-6 shadow-sm flex flex-col hover:border-ink/10 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-ink text-[16px]">Predicted CTR Benchmark</h3>
                    {thumbFeatures && thumbFeatures.predictedCtr > 0.08 && (
                      <div className="px-2.5 py-1 rounded bg-good/10 text-good text-[12px] font-bold">
                        {thumbFeatures.predictedCtr > 0.12 ? "TOP 5%" : "ABOVE AVG"}
                      </div>
                    )}
                  </div>
                  <p className="text-[13px] text-ink-soft mb-6">
                    {thumbFeatures
                      ? `Based on ${thumbFeatures.faceCount > 0 ? "face presence, " : ""}${(thumbFeatures.contrast * 100).toFixed(0)}% contrast, and ${(thumbFeatures.textAreaRatio * 100).toFixed(0)}% text coverage.`
                      : "Based on your visual contrast and psychological hook scores, this thumbnail is predicted to outperform niche averages significantly."}
                  </p>
                  
                  <div className="space-y-4 mt-auto">
                    <div>
                      <div className="flex justify-between text-[13px] font-semibold mb-1.5">
                        <span className="text-ink">Your Prediction</span>
                        <span className="text-good">{(thumbFeatures ? thumbFeatures.predictedCtr * 100 : 4.5).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                        <div className="h-full bg-good rounded-full" style={{ width: `${Math.min(100, (thumbFeatures ? thumbFeatures.predictedCtr / 0.12 : 0.35) * 100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[13px] font-medium mb-1.5 text-ink-soft">
                        <span>Niche Average</span>
                        <span>4.5%</span>
                      </div>
                      <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                        <div className="h-full bg-ink/20 rounded-full" style={{ width: '35%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* A/B Test Upload Section */}
                {!thumbUrlB ? (
                  <div 
                    onClick={() => inputRefB.current?.click()}
                    className="bg-surface border border-dashed border-hairline rounded-[24px] p-6 shadow-sm flex flex-col items-center justify-center text-center group cursor-pointer hover:border-good/50 hover:bg-good/5 transition-all relative overflow-hidden"
                  >
                     <input ref={inputRefB} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptB(f); }} />
                     <div className="w-14 h-14 rounded-full bg-surface-2 border border-hairline flex items-center justify-center mb-4 text-ink group-hover:scale-110 group-hover:text-good transition-all shadow-sm z-10">
                        <span className="font-bold tracking-tight">A/B</span>
                     </div>
                     <h3 className="font-semibold text-ink text-[16px] mb-2 z-10">Run A/B Split Test</h3>
                     <p className="text-[13px] text-ink-soft mb-5 max-w-[240px] z-10">
                        Upload an alternative variation of your thumbnail to immediately compare visual scores side-by-side.
                     </p>
                     <div className="px-6 py-2.5 rounded-xl bg-ink text-surface text-[13px] font-semibold hover:opacity-90 transition-all shadow-lg z-10">
                        Upload Version B
                     </div>
                  </div>
                ) : (
                  <div className="bg-surface border border-hairline rounded-[24px] p-6 shadow-sm flex flex-col">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-ink text-[16px]">A/B Test Results</h3>
                        <button onClick={() => { setThumbUrlB(null); setAiDataB(null); }} className="text-[11px] font-bold text-ink-soft hover:text-red-500 uppercase">Clear B</button>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex flex-col gap-2">
                           <div className={`relative aspect-video rounded-lg overflow-hidden border-2 ${(!aiDataB || aiData.overallScore >= aiDataB.overallScore) ? 'border-good shadow-[0_0_15px_rgba(61,220,107,0.15)]' : 'border-hairline'}`}>
                              <img src={thumbUrl!} className="w-full h-full object-cover" />
                              <div className="absolute top-1 left-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">A</div>
                           </div>
                           <div className="text-center font-bold text-[18px]">{aiData.overallScore}/10</div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                           <div className={`relative aspect-video rounded-lg overflow-hidden border-2 ${aiDataB && aiDataB.overallScore > aiData.overallScore ? 'border-good shadow-[0_0_15px_rgba(61,220,107,0.15)]' : 'border-hairline'}`}>
                              <img src={thumbUrlB!} className="w-full h-full object-cover" />
                              <div className="absolute top-1 left-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">B</div>
                              {isAnalyzingB && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                                </div>
                              )}
                           </div>
                           <div className="text-center font-bold text-[18px] text-ink">{isAnalyzingB ? "..." : (aiDataB ? `${aiDataB.overallScore}/10` : "-")}</div>
                        </div>
                     </div>
                     
                     {!isAnalyzingB && aiDataB && (
                        <div className="mt-auto bg-surface-2 p-3 rounded-xl border border-hairline">
                           <p className="text-[13px] text-ink-soft leading-tight">
                              {aiData.overallScore >= aiDataB.overallScore 
                                ? "Version A remains the strongest variant. Its visual contrast and hook outscore Version B." 
                                : "Version B is the new winner! The alternative layout creates a stronger visual hook."}
                           </p>
                        </div>
                     )}
                  </div>
                )}

              </div>

            </div>

            {/* Right Side: AI Intelligence Profile */}
            <div className="xl:col-span-4 flex flex-col order-1 xl:order-2">
              <div className="mb-6">
                <div className="text-[12px] uppercase tracking-[0.14em] text-ink-soft font-medium">Auto-detected: {format === 'short' ? '9:16 Short' : '16:9 Long-form'}</div>
                <h2 className="mt-2 font-display text-[32px] leading-[1.02] font-bold tracking-[-0.025em] text-ink">
                  AI Vision Scan
                </h2>
              </div>
              <div className="space-y-6">
                 <ScoreRing
                    score={aiData.overallScore}
                    grade={letterGradeTen(aiData.overallScore)}
                    headline="Multimodal Context Analysis"
                    summary={aiData.explanation}
                    maxScore={10}
                  />

                  {/* Feedback thumbs */}
                  <div className="flex items-center justify-end gap-2 -mt-2 mb-1">
                    <span className="text-[11px] text-ink-soft mr-auto">Was this analysis accurate?</span>
                    <button
                      onClick={() => onFeedback("positive")}
                      className={`size-7 rounded-full flex items-center justify-center transition-all ${
                        feedback === "positive" ? "bg-good/15 text-good" : "text-ink-soft hover:bg-surface-2"
                      }`}
                      title="Accurate"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button
                      onClick={() => onFeedback("negative")}
                      className={`size-7 rounded-full flex items-center justify-center transition-all ${
                        feedback === "negative" ? "bg-critical/15 text-critical" : "text-ink-soft hover:bg-surface-2"
                      }`}
                      title="Inaccurate"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>

                  <MetricBars metrics={aiData.metrics} maxScore={10} />
                 
                 <div className="bg-surface border border-hairline rounded-[24px] p-6 shadow-sm mt-4">
                    <div className="text-[13px] font-semibold text-ink-soft mb-2 block uppercase tracking-wider">Video Title Tested</div>
                    <div className="text-[15px] font-bold text-ink mb-4">{title}</div>
                    
                    <div className="text-[13px] font-semibold text-ink-soft mb-2 block uppercase tracking-wider">Niche / topic</div>
                    <div className="text-[14px] text-ink-soft leading-relaxed bg-surface-2 p-3 rounded-lg">{context}</div>
                 </div>
              </div>
            </div>

          </div>
        </main>
      )}
    </div>
  );
}
