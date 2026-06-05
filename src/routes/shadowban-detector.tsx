import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createServerFn } from "@tanstack/react-start";
import { saveChannelIntel } from "@/lib/channel-session";
import { ChannelDigestCard, DataReceiptsStrip } from "@/components/intel/ChannelDigestCard";
import { runShadowbanDetection } from "@/lib/youtube/shadowban-server";
import { addActivity, saveResult, loadResult } from "@/lib/activity";
import { hasCredits, deductCredit } from "@/lib/credits";
import { recordUsage } from "@/lib/usage";
import { Shield, ShieldAlert, ShieldCheck, ShieldX, Search, ArrowRight, AlertTriangle, CheckCircle2, TrendingDown, FileWarning, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/shadowban-detector")({
  validateSearch: (s: Record<string, unknown>) => ({
    channel: typeof s.channel === "string" ? s.channel : undefined,
    activityId: typeof s.activityId === "string" ? s.activityId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shadowban Detector — Viraleo" },
      { name: "description", content: "Check if your YouTube channel is shadowbanned. AI analysis of search indexability, metadata health, engagement velocity, and community health signals." },
      { property: "og:title", content: "Shadowban Detector — Viraleo" },
      { property: "og:description", content: "Check if your YouTube channel is shadowbanned. AI-powered signal analysis." },
      { property: "og:image", content: "https://viraleo.pro/vi-logo.png" },
      { property: "og:url", content: "https://viraleo.pro/shadowban-detector" },
      { name: "twitter:title", content: "Shadowban Detector — Viraleo" },
      { name: "twitter:description", content: "Check your YouTube channel for shadowban signals." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/shadowban-detector" }],
  }),
  component: ShadowbanDetectorPage,
});

export const detectShadowbanServer = createServerFn({ method: "POST" })
  .inputValidator((d: { channel: string }) => d)
  .handler(async ({ data }) => {
    return runShadowbanDetection(data.channel);
  });


const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof Shield; glow: string }> = {
  healthy:     { color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-200", icon: ShieldCheck, glow: "shadow-[0_0_40px_rgba(16,185,129,0.15)]" },
  warmup:      { color: "text-amber-600",   bg: "bg-amber-50",    border: "border-amber-200",   icon: Shield,      glow: "shadow-[0_0_40px_rgba(245,158,11,0.15)]" },
  restricted:  { color: "text-orange-600",  bg: "bg-orange-50",   border: "border-orange-200",  icon: ShieldAlert, glow: "shadow-[0_0_40px_rgba(234,88,12,0.15)]"  },
  shadowbanned:{ color: "text-red-600",     bg: "bg-red-50",      border: "border-red-200",     icon: ShieldX,     glow: "shadow-[0_0_40px_rgba(220,38,38,0.2)]"   },
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden mt-2">
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${score}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

function RainbowUnderline() {
  return (
    <svg className="absolute w-[108%] h-5 -bottom-2 -left-[4%] pointer-events-none" viewBox="0 0 200 20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rbGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff4b4b" />
          <stop offset="20%" stopColor="#ff9a00" />
          <stop offset="40%" stopColor="#ffe600" />
          <stop offset="60%" stopColor="#3fdad8" />
          <stop offset="80%" stopColor="#7b61ff" />
          <stop offset="100%" stopColor="#e040fb" />
        </linearGradient>
      </defs>
      <motion.path
        d="M 4,14 Q 30,6 60,13 T 110,9 T 160,13 T 196,8"
        stroke="url(#rbGrad)" strokeWidth="3" fill="none" strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.4, ease: "easeInOut" }}
      />
    </svg>
  );
}

function RadarPing({ status }: { status: string }) {
  const ringColor = status === "healthy" ? "border-emerald-400" : status === "warmup" ? "border-amber-400" : status === "restricted" ? "border-orange-400" : "border-red-400";
  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      {[0, 1].map(i => (
        <motion.div key={i}
          className={`absolute rounded-full border ${ringColor} opacity-60`}
          initial={{ opacity: 0.5, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 2.5, delay: i * 1.1, repeat: Infinity, ease: "easeOut" }}
          style={{ width: "100%", height: "100%" }}
        />
      ))}
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${STATUS_CONFIG[status]?.bg} ${STATUS_CONFIG[status]?.border} border-2 ${STATUS_CONFIG[status]?.glow}`}>
        {(() => { const I = STATUS_CONFIG[status]?.icon || Shield; return <I size={26} className={STATUS_CONFIG[status]?.color} />; })()}
      </div>
    </div>
  );
}

function ShadowbanDetectorPage() {
  const { channel: channelParam, activityId: activityIdParam } = Route.useSearch();
  const [channel, setChannel] = useState("");
  const [phase, setPhase] = useState<"idle" | "scanning" | "results" | "notfound">("idle");
  const [data, setData] = useState<any>(null);
  const [tick, setTick] = useState(0);
  const [searchedChannel, setSearchedChannel] = useState("");

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

  const scanLabels = ["Querying search index...", "Analyzing metadata signals...", "Measuring engagement velocity...", "Auditing community health...", "Compiling escape protocol..."];

  useEffect(() => {
    if (phase !== "scanning") return;
    const t = setInterval(() => setTick(p => (p + 1) % scanLabels.length), 1800);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (channelParam && phase === "idle" && !channel) {
      setChannel(channelParam.startsWith("@") ? channelParam : `@${channelParam}`);
    }
  }, [channelParam, channel, phase]);

  const run = async (ch: string) => {
    if (!ch.trim()) return;
    if (!hasCredits()) {
      toast.error("You're out of credits for this month. Upgrade your plan to continue.");
      return;
    }
    setSearchedChannel(ch.trim());
    setPhase("scanning");
    try {
      const result = await detectShadowbanServer({ data: { channel: ch.trim() } });
      const { _intelBundle, ...report } = result as typeof result & {
        _intelBundle?: import("@/lib/youtube/types").ChannelIntelBundle;
      };
      if (_intelBundle) saveChannelIntel(_intelBundle);
      setData(report);
      deductCredit();
      recordUsage("shadowban");
      const entry = addActivity("shadowban-detector", ch.trim());
      saveResult(entry.id, report);
      setPhase("results");
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("CHANNEL_NOT_FOUND")) {
        setPhase("notfound");
      } else if (msg.includes("YOUTUBE_API_KEY_REQUIRED")) {
        toast.error("YouTube API key is missing. Please set YOUTUBE_API_KEY in your .env file.");
        setPhase("idle");
      } else if (msg.includes("YOUTUBE_API_KEY_IS_OAUTH_CLIENT_ID")) {
        toast.error("The key in .env appears to be an OAuth Client ID instead of a YouTube Data API Key.");
        setPhase("idle");
      } else if (msg.includes("YOUTUBE_API_KEY_INVALID_FORMAT")) {
        toast.error("The YOUTUBE_API_KEY format is invalid. YouTube Data API keys start with 'AIzaSy'.");
        setPhase("idle");
      } else if (msg.includes("YOUTUBE_API_KEY_INVALID")) {
        toast.error("The YouTube Data API returned an 'API key not valid' error.");
        setPhase("idle");
      } else if (msg.includes("YOUTUBE_API_NOT_ENABLED")) {
        toast.error("The YouTube Data API v3 is not enabled in your Google Cloud project.");
        setPhase("idle");
      } else {
        toast.error(`Scan failed: ${msg || "Unknown error"}. Please try again.`);
        setPhase("idle");
      }
    }
  };

  const reset = () => { setPhase("idle"); setData(null); setChannel(""); setSearchedChannel(""); };
  const cfg = data ? STATUS_CONFIG[data.status] : null;

  return (
    <div className="min-h-screen bg-surface text-ink font-text relative overflow-x-hidden">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-red-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-orange-400/5 blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">

        {/* NOT FOUND */}
        {phase === "notfound" && (
          <motion.main key="notfound" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="relative z-10 max-w-2xl mx-auto px-6 pt-24 pb-32 flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(220,38,38,0.15)]">
              <ShieldX size={36} className="text-red-500" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-ink mb-3">Channel not found</h2>
            <p className="text-base text-ink-soft max-w-sm mb-8">
              We couldn&apos;t find a YouTube channel matching <span className="font-bold text-ink">&ldquo;{searchedChannel}&rdquo;</span>. Please check the handle or URL and try again.
            </p>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={reset}
              className="bg-ink text-surface text-[13px] font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition"
            >
              Try again
            </motion.button>
          </motion.main>
        )}

        {/* IDLE */}
        {phase === "idle" && (
          <motion.main key="idle" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="relative z-10 max-w-2xl mx-auto px-6 pt-24 pb-32"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-200 rounded-full px-4 py-1.5 text-red-600 text-[12px] font-bold uppercase tracking-widest mb-6">
                <ShieldAlert size={12} /> Algorithmic Audit Engine
              </div>
              <h1 className="font-display text-[52px] md:text-[62px] font-black leading-[1.02] tracking-[-0.03em] text-ink mb-4">
                Are you<br />
                <span className="relative inline-block">
                  shadowbanned?
                  <RainbowUnderline />
                </span>
              </h1>
              <p className="text-[16px] text-ink-soft max-w-md mx-auto mt-4">
                Enter your YouTube channel handle or URL. Our AI will run a real indexability audit — no guessing, pure data.
              </p>
            </div>

            <div className="bg-surface border border-hairline rounded-[28px] shadow-[0_4px_60px_-20px_rgba(0,0,0,0.1)] overflow-hidden">
              <div className="flex items-center gap-4 px-6 py-5">
                <Search size={20} className="text-ink-soft shrink-0" />
                <input
                  type="text" value={channel}
                  onChange={e => setChannel(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && run(channel)}
                  placeholder="@YourChannel or youtube.com/c/..."
                  className="flex-1 bg-transparent text-[16px] text-ink placeholder:text-ink-soft/50 focus:outline-none"
                  autoFocus
                />
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => run(channel)}
                  className="bg-ink text-surface text-[13px] font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shrink-0 hover:opacity-90 transition"
                >
                  Scan <ArrowRight size={14} />
                </motion.button>
              </div>
              <div className="border-t border-hairline px-6 py-4 bg-surface-2/40 flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Try:</span>
                {["@MrBeast", "@PewDiePie", "My Channel"].map(n => (
                  <button key={n} onClick={() => { setChannel(n); run(n); }}
                    className="text-[11px] font-medium px-3 py-1 rounded-full bg-surface border border-hairline text-ink-soft hover:text-ink hover:border-ink/20 transition"
                  >{n}</button>
                ))}
              </div>
            </div>
          </motion.main>
        )}

        {/* SCANNING */}
        {phase === "scanning" && (
          <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 cursor-none select-none"
          >
            <div className="relative flex items-center justify-center w-24 h-24">
              {[0, 1].map(i => (
                <motion.div key={i}
                  className="absolute rounded-full border border-red-400 opacity-60"
                  initial={{ opacity: 0.5, scale: 0.8 }} animate={{ opacity: 0, scale: 1.7 }}
                  transition={{ duration: 2.5, delay: i * 1.1, repeat: Infinity, ease: "easeOut" }}
                  style={{ width: "100%", height: "100%" }}
                />
              ))}
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                  <RefreshCw size={20} className="text-red-500" />
                </motion.div>
              </div>
            </div>
            <div className="text-center">
              <h2 className="font-display text-[26px] font-bold text-ink mb-2">Scanning "{channel}"</h2>
              <AnimatePresence mode="wait">
                <motion.p key={tick} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="text-[14px] text-ink-soft"
                >
                  {scanLabels[tick]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* RESULTS */}
        {phase === "results" && data && cfg && (
          <motion.main key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative z-10 max-w-[1200px] mx-auto px-6 pt-10 pb-24"
          >
            {/* Back */}
            <button onClick={reset} className="text-[12px] font-semibold text-ink-soft hover:text-ink uppercase tracking-widest mb-8 flex items-center gap-1.5 transition">
              ← New Scan
            </button>

            <ChannelDigestCard
              digest={data.channelDigest}
              hasTranscript={data.hasTranscript}
              className="mb-4"
            />
            {data.dataReceipts?.length > 0 && (
              <div className="mb-6">
                <DataReceiptsStrip receipts={data.dataReceipts} />
              </div>
            )}

            {/* Hero Status Banner */}
            <div className={`rounded-[28px] border-2 ${cfg.border} ${cfg.bg} ${cfg.glow} p-8 mb-8 flex flex-col md:flex-row items-center gap-8`}>
              <RadarPing status={data.status} />
              <div className="text-center md:text-left">
                <div className={`text-[12px] font-bold uppercase tracking-widest ${cfg.color} mb-2`}>Audit Complete</div>
                <h1 className="font-display text-[36px] font-black text-ink leading-tight">{data.channelName}</h1>
                <div className={`text-[22px] font-bold mt-1 ${cfg.color}`}>{data.statusLabel}</div>
                <p className="text-[15px] text-ink-soft mt-2 max-w-lg">{data.verdict}</p>
              </div>
              <div className="ml-auto shrink-0 flex flex-col items-center gap-1">
                <div className={`text-[56px] font-black leading-none ${cfg.color}`}>{data.riskScore}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Risk Score</div>
              </div>
            </div>

            {/* Diagnostic Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

              {/* Left: 4 Pillars */}
              <div className="xl:col-span-7 space-y-4">
                <h2 className="font-semibold text-ink text-[18px] mb-2">Diagnostic Pillars</h2>

                {[
                  {
                    icon: Search, title: "Search Indexability",
                    score: data.indexability.score, status: data.indexability.status,
                    insight: data.indexability.insight,
                    barColor: data.indexability.score > 70 ? "bg-emerald-400" : data.indexability.score > 40 ? "bg-amber-400" : "bg-red-400"
                  },
                  {
                    icon: FileWarning, title: "Metadata Health",
                    score: data.metadataHealth.score, status: `${data.metadataHealth.flaggedTerms.length} flags`,
                    insight: data.metadataHealth.insight,
                    barColor: data.metadataHealth.score > 70 ? "bg-emerald-400" : data.metadataHealth.score > 40 ? "bg-amber-400" : "bg-red-400"
                  },
                  {
                    icon: TrendingDown, title: "Engagement Velocity",
                    score: data.engagementVelocity.score, status: data.engagementVelocity.pattern,
                    insight: data.engagementVelocity.insight,
                    barColor: data.engagementVelocity.score > 70 ? "bg-emerald-400" : data.engagementVelocity.score > 40 ? "bg-amber-400" : "bg-red-400"
                  },
                  {
                    icon: Shield, title: "Community Health",
                    score: data.communityHealth.score, status: `${data.communityHealth.strikes} strikes`,
                    insight: data.communityHealth.insight,
                    barColor: data.communityHealth.score > 70 ? "bg-emerald-400" : data.communityHealth.score > 40 ? "bg-amber-400" : "bg-red-400"
                  },
                ].map(({ icon: Icon, title, score, status, insight, barColor }) => (
                  <div key={title} className="bg-surface border border-hairline rounded-[20px] p-5 hover:border-ink/10 transition-all hover:shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <div className="flex items-center gap-2">
                        <Icon size={15} className="text-ink-soft shrink-0" />
                        <span className="font-bold text-[14px] text-ink">{title}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[12px] font-medium text-ink-soft">{status}</span>
                        <span className="text-[15px] font-black text-ink">{score}/100</span>
                      </div>
                    </div>
                    <ScoreBar score={score} color={barColor} />
                    <p className="text-[13px] text-ink-soft mt-3 leading-relaxed">{insight}</p>
                  </div>
                ))}

                {/* Flagged Terms */}
                {data.metadataHealth.flaggedTerms.length > 0 && (
                  <div className="bg-orange-50 border border-orange-100 rounded-[20px] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={15} className="text-orange-600" />
                      <span className="font-bold text-[14px] text-orange-700">Flagged Metadata Terms</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.metadataHealth.flaggedTerms.map((t: string) => (
                        <span key={t} className="text-[12px] font-bold px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-orange-700">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Escape Protocol */}
              <div className="xl:col-span-5 space-y-4">
                <h2 className="font-semibold text-ink text-[18px] mb-2">Algorithmic Escape Protocol</h2>
                <div className="bg-surface border border-hairline rounded-[24px] p-6 hover:border-ink/10 transition-all">
                  <div className="space-y-5">
                    {data.escapeProtocol.map((step: any) => (
                      <div key={step.step} className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-ink text-surface text-[12px] font-black flex items-center justify-center shrink-0 mt-0.5">{step.step}</div>
                        <div>
                          <div className="font-bold text-[14px] text-ink mb-1">{step.action}</div>
                          <p className="text-[13px] text-ink-soft leading-relaxed">{step.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recovery Timeline */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-[20px] p-5 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[14px] text-emerald-700 mb-1">Estimated Recovery Timeline</div>
                    <p className="text-[13px] text-emerald-700/80">{data.recoveryTimeline}</p>
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
