import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { createServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowRight, GitBranch, RotateCcw, Sparkles, BarChart3, Zap } from "lucide-react";
import { normalizeChannelInput } from "@/lib/channel-session";
import { addActivity, saveResult, loadResult } from "@/lib/activity";
import { useUserState } from "@/lib/user-state";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { recordUsage } from "@/lib/usage";
import { ViraleoLogo } from "@/components/ViraleoLogo";
import { BlueprintFlow } from "@/components/blueprint/BlueprintFlow";
import { EvidenceCard } from "@/components/blueprint/EvidenceCard";
import { DecisionTree } from "@/components/blueprint/DecisionTree";
import { AdvancedMetricsCard } from "@/components/blueprint/AdvancedMetricsCard";
import { BlueprintSimulator } from "@/components/blueprint/BlueprintSimulator";
import type { ChannelBlueprint } from "@/lib/youtube/blueprint-server";
import type { FlowNodeData } from "@/components/blueprint/FlowNode";

export const Route = createFileRoute("/blueprint")({
  validateSearch: (s: Record<string, unknown>) => ({
    channel: typeof s.channel === "string" ? normalizeChannelInput(s.channel) : undefined,
    activityId: typeof s.activityId === "string" ? s.activityId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Advanced Channel Blueprint — Viraleo" },
      {
        name: "description",
        content:
          "Reverse-engineer any YouTube channel's winning formula with strict mathematical leverage metrics, retention architecture, and interactive scenario simulation.",
      },
      { property: "og:title", content: "Advanced Channel Blueprint — Viraleo" },
      {
        property: "og:description",
        content: "Decode any channel's outlier multiplier, retention architecture, and growth anti-patterns.",
      },
      { property: "og:image", content: "https://viraleo.pro/vi-logo.png" },
      { property: "og:url", content: "https://viraleo.pro/blueprint" },
      { name: "twitter:title", content: "Advanced Channel Blueprint — Viraleo" },
      { name: "twitter:description", content: "Reverse-engineer YouTube channel formulas with strict data." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/blueprint" }],
  }),
  component: BlueprintPage,
});

// ─── Safe Server Function ──────────────────────────────────────────────────────
export const runBlueprintServer = createServerFn({ method: "POST" })
  .inputValidator((d: { channelInput: string }) => d)
  .handler(async ({ data }) => {
    try {
      const { requireAuth, requireCredits } = await import("@/lib/auth/server-auth");
      const user = await requireAuth();
      await requireCredits(user.email);
      const { runChannelBlueprint } = await import("@/lib/youtube/blueprint-server");
      const blueprintData = await runChannelBlueprint(data.channelInput);
      return { ok: true as const, data: JSON.parse(JSON.stringify(blueprintData)) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false as const, error: msg };
    }
  });

// ─── Flow Node Builder ─────────────────────────────────────────────────────────
function buildFlowNodes(bp: ChannelBlueprint): {
  flowNodes: FlowNodeData[];
  branchNodes: FlowNodeData[];
  tailNodes: FlowNodeData[];
} {
  const flowNodes: FlowNodeData[] = [
    {
      id: "channel",
      emoji: "📺",
      label: bp.channelName,
      detail: bp.channelHandle || undefined,
      tone: "default",
    },
    {
      id: "analysis",
      emoji: "🔬",
      label: `${bp.flowSummary.totalVideos} Videos Analyzed`,
      detail: `Outlier Leverage: ${bp.flowSummary.outlierMultiplier}x Baseline`,
      tone: "highlight",
    },
  ];

  const branchNodes: FlowNodeData[] = [
    {
      id: "topic",
      emoji: "🎯",
      label: bp.winningTopic.topic,
      detail: "Winning Topic Cluster",
      winRate: bp.winningTopic.winRate,
      confidence: bp.winningTopic.confidence,
      tone: "highlight",
    },
    {
      id: "length",
      emoji: "⏱️",
      label: bp.winningLength.bucket,
      detail: `+${bp.winningLength.multiplier}x Median Views`,
      evidence: `Based on ${bp.winningLength.videoCount} videos`,
      confidence: bp.winningLength.confidence,
      tone: "highlight",
    },
    {
      id: "schedule",
      emoji: "📅",
      label: bp.winningPublishing.bestDays,
      detail: "Optimal Upload Window",
      evidence: bp.winningPublishing.evidence,
      confidence: bp.winningPublishing.confidence,
      tone: "highlight",
    },
  ];

  const tailNodes: FlowNodeData[] = [
    {
      id: "pattern",
      emoji: "⚡",
      label: "Title Syntax Pattern",
      detail: bp.titlePattern.slice(0, 65) + (bp.titlePattern.length > 65 ? "…" : ""),
      tone: "default",
    },
    {
      id: "formula",
      emoji: "🏆",
      label: "Replicable Blueprint Locked",
      detail: `${bp.flowSummary.outlierMultiplier}x View Multiplier Potential`,
      tone: "win",
    },
  ];

  return { flowNodes, branchNodes, tailNodes };
}

// ─── Main Component ───────────────────────────────────────────────────────────
function BlueprintPage() {
  const { channel: channelParam, activityId: activityIdParam } = Route.useSearch();
  const { hasCredits, refresh, loading: creditsLoading } = useUserState();

  const [phase, setPhase] = useState<"idle" | "analyzing" | "results">((): "idle" | "analyzing" | "results" => {
    if (activityIdParam) {
      const cached = loadResult<ChannelBlueprint>(activityIdParam);
      if (cached) return "results";
    }
    return "idle";
  });

  const [channel, setChannel] = useState(channelParam || "");
  const [blueprint, setBlueprint] = useState<ChannelBlueprint | null>(() => {
    if (activityIdParam) return loadResult<ChannelBlueprint>(activityIdParam);
    return null;
  });
  const [progress, setProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);

  const steps = [
    "Ingesting raw YouTube video metrics…",
    "Calculating baseline vs outlier median distribution…",
    "Deconstructing 30s hook retention architecture…",
    "Mapping title syntax and visual contrast indexes…",
    "Locking channel growth blueprint…",
  ];

  const runAnalysis = useCallback(async () => {
    const input = channel.trim();
    if (!input) {
      toast.error("Enter a channel handle or URL.");
      return;
    }
    if (!creditsLoading && !hasCredits) {
      toast.error("You're out of credits. Upgrade to continue.");
      return;
    }

    setPhase("analyzing");
    setProgress(0);
    setLoadingStep(0);
    let p = 0;
    let stepIdx = 0;
    const interval = setInterval(() => {
      p += (94 - p) * 0.045;
      setProgress(p);
      stepIdx = Math.min(Math.floor(p / 20), steps.length - 1);
      setLoadingStep(stepIdx);
    }, 200);

    try {
      const response = await runBlueprintServer({
        data: { channelInput: normalizeChannelInput(input) },
      });

      clearInterval(interval);

      if (!response.ok) {
        setProgress(0);
        setPhase("idle");
        if (response.error === "UNAUTHORIZED") {
          toast.error("Session expired. Please sign in again.");
        } else if (response.error === "OUT_OF_CREDITS") {
          toast.error("Out of credits. Upgrade your plan to continue.");
        } else if (response.error.includes("CHANNEL_NOT_FOUND")) {
          toast.error("YouTube channel not found. Please check the handle or URL.");
        } else {
          toast.error(`Blueprint analysis failed: ${response.error}`);
        }
        return;
      }

      const result = response.data as ChannelBlueprint;
      setProgress(100);
      setBlueprint(result);
      await refresh();
      recordUsage("blueprint");
      const entry = addActivity("blueprint", result.channelName, result.channelHandle || input);
      saveResult(entry.id, result);
      toast.success("Advanced Blueprint unlocked!");
      setTimeout(() => setPhase("results"), 350);
    } catch (err) {
      clearInterval(interval);
      setProgress(0);
      setPhase("idle");
      console.error("Blueprint network error:", err);
      toast.error("Network error during blueprint analysis. Please try again.");
    }
  }, [channel, hasCredits, creditsLoading]);

  const reset = () => {
    setPhase("idle");
    setBlueprint(null);
    setChannel("");
    setProgress(0);
  };

  // ─── Idle phase ─────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="min-h-screen bg-surface text-ink font-text relative bp-canvas-bg">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-emerald-400/8 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 size-[400px] rounded-full bg-blue-400/6 blur-3xl" />
        </div>

        <main className="relative mx-auto max-w-2xl px-6 pt-20 pb-24 z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <div className="flex justify-center mb-5">
              <ViraleoLogo linkTo="/blueprint" size="xl" showText={false} />
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft font-semibold mb-3">
              Elite Intelligence Engine
            </div>
            <h1 className="font-display text-[36px] sm:text-[52px] leading-[1.0] font-bold tracking-[-0.03em] text-ink">
              Channel Blueprint <br />
              <span className="text-emerald-500">Reverse-Engineering.</span>
            </h1>
            <p className="mt-4 text-[15px] text-ink-soft max-w-md mx-auto leading-relaxed">
              Extract strict outlier multipliers, title syntax ratios, 30s hook retention architecture, and growth anti-patterns directly from raw video performance.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10"
          >
            <div className="rounded-[24px] border border-hairline bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_60px_-30px_rgba(0,0,0,0.12)] p-8">
              <label className="block text-[12px] font-semibold uppercase tracking-wider text-ink-soft mb-2">
                Target YouTube Channel
              </label>
              <input
                id="blueprint-channel-input"
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
                placeholder="e.g. @mkbhd, MrBeast, youtube.com/c/..."
                className="w-full px-4 py-3 rounded-xl bg-ink/5 border border-hairline text-ink text-[14px] placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
              />
              <button
                id="blueprint-run-btn"
                type="button"
                onClick={runAnalysis}
                disabled={!channel.trim()}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-ink text-surface py-3.5 text-[14px] font-semibold hover:opacity-90 disabled:opacity-40 transition"
              >
                <GitBranch size={16} />
                Generate Advanced Blueprint
                <ArrowRight size={15} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { emoji: "⚡", label: "Outlier Multiplier" },
                { emoji: "🎯", label: "30s Hook Flow" },
                { emoji: "⚠️", label: "Growth Traps" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-hairline bg-surface p-3 text-[12px] text-ink-soft"
                >
                  <div className="text-xl mb-1">{item.emoji}</div>
                  {item.label}
                </div>
              ))}
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // ─── Analyzing phase ─────────────────────────────────────────────────────────
  if (phase === "analyzing") {
    return (
      <div className="min-h-screen bg-surface text-ink font-text flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="mx-auto size-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5"
          >
            <GitBranch size={26} className="text-emerald-600" />
          </motion.div>
          <div className="font-display text-[20px] font-semibold text-ink">{channel}</div>
          <div className="mt-2 text-[13px] text-ink-soft">{steps[loadingStep]}</div>
          <div className="mt-5 mx-auto max-w-[220px] h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.15 }}
            />
          </div>
          <div className="mt-2 text-[11px] text-ink-soft/50">{Math.round(progress)}%</div>
        </div>
      </div>
    );
  }

  // ─── Results phase ─────────────────────────────────────────────────────────
  if (!blueprint) return null;
  const { flowNodes, branchNodes, tailNodes } = buildFlowNodes(blueprint);

  return (
    <div className="min-h-screen bg-surface text-ink font-text">
      <UpgradeBanner />

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-hairline bg-surface/95 backdrop-blur-md px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink transition rounded-lg px-2 py-1 hover:bg-ink/5"
        >
          <RotateCcw size={14} />
          New Blueprint
        </button>
        <div className="h-4 w-px bg-hairline" />
        {blueprint.thumbnailUrl && (
          <img
            src={blueprint.thumbnailUrl}
            alt={blueprint.channelName}
            className="size-6 rounded-full object-cover"
          />
        )}
        <span className="text-[14px] font-semibold text-ink truncate">{blueprint.channelName}</span>
        {blueprint.subscriberCount && (
          <span className="text-[12px] text-ink-soft ml-auto shrink-0 font-mono">
            {blueprint.subscriberCount} subs
          </span>
        )}
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 space-y-16">
        {/* Hero Summary & Leverage Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-[12px] font-semibold text-emerald-700">
              <Sparkles size={14} />
              Strict Mathematical Blueprint · {blueprint.flowSummary.totalVideos} Videos Analyzed
            </div>
            <h1 className="font-display text-[30px] sm:text-[44px] font-bold tracking-[-0.025em] text-ink leading-tight">
              {blueprint.channelName}'s Winning Formula
            </h1>
            <p className="text-[14px] text-ink-soft max-w-xl mx-auto">
              Top 15% outlier videos generate{" "}
              <strong className="text-emerald-600 font-mono text-[15px]">
                {blueprint.flowSummary.outlierMultiplier}x baseline views
              </strong>{" "}
              and control {blueprint.flowSummary.topViewShare}% of all channel views.
            </p>
          </div>

          {/* Core Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-hairline bg-surface shadow-sm text-center">
              <span className="text-[11px] text-ink-soft uppercase font-medium tracking-wider block">
                Outlier Leverage
              </span>
              <div className="text-2xl font-display font-bold text-emerald-600 mt-1">
                {blueprint.flowSummary.outlierMultiplier}x
              </div>
              <span className="text-[10px] text-ink-soft/70">vs baseline median</span>
            </div>

            <div className="p-4 rounded-2xl border border-hairline bg-surface shadow-sm text-center">
              <span className="text-[11px] text-ink-soft uppercase font-medium tracking-wider block">
                Baseline Median
              </span>
              <div className="text-2xl font-display font-bold text-ink mt-1">
                {blueprint.flowSummary.baselineMedianViews.toLocaleString()}
              </div>
              <span className="text-[10px] text-ink-soft/70">views per video</span>
            </div>

            <div className="p-4 rounded-2xl border border-hairline bg-surface shadow-sm text-center">
              <span className="text-[11px] text-ink-soft uppercase font-medium tracking-wider block">
                Outlier Median
              </span>
              <div className="text-2xl font-display font-bold text-blue-600 mt-1">
                {blueprint.flowSummary.outlierMedianViews.toLocaleString()}
              </div>
              <span className="text-[10px] text-ink-soft/70">top 15% median</span>
            </div>

            <div className="p-4 rounded-2xl border border-hairline bg-surface shadow-sm text-center">
              <span className="text-[11px] text-ink-soft uppercase font-medium tracking-wider block">
                Optimal Duration
              </span>
              <div className="text-xl font-display font-bold text-ink mt-1 truncate">
                {blueprint.winningLength.bucket}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">
                +{blueprint.winningLength.multiplier}x views
              </span>
            </div>
          </div>
        </motion.div>

        {/* Flowchart */}
        <section>
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft font-semibold mb-6 text-center">
            Blueprint Architecture Flow
          </div>
          <BlueprintFlow
            flowNodes={flowNodes}
            branchNodes={branchNodes}
            tailNodes={tailNodes}
          />
        </section>

        {/* Advanced Metrics Component (Title Syntax, Thumbnail Rules, 30s Hook Architecture, Anti-Patterns) */}
        {blueprint.advancedMetrics && (
          <section>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft font-semibold mb-5 flex items-center gap-2">
              <BarChart3 size={16} className="text-emerald-500" />
              Advanced Syntax & Retention Architecture
            </div>
            <AdvancedMetricsCard metrics={blueprint.advancedMetrics} />
          </section>
        )}

        {/* Strategy Simulator Component */}
        <section>
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft font-semibold mb-5 flex items-center gap-2">
            <Zap size={16} className="text-emerald-500" />
            Strategy Simulator
          </div>
          <BlueprintSimulator blueprint={blueprint} />
        </section>

        {/* Evidence Breakdown Cards */}
        {blueprint.evidenceSections.length > 0 && (
          <section>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft font-semibold mb-5">
              Empirical Evidence Breakdown
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {blueprint.evidenceSections.map((section, i) => (
                <EvidenceCard key={section.id} section={section} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Decision Tree Framework */}
        {blueprint.decisionSteps.length > 0 && (
          <section>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft font-semibold mb-5">
              Multi-Branch Decision Tree
            </div>
            <DecisionTree steps={blueprint.decisionSteps} />
          </section>
        )}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center border-t border-hairline pt-12"
        >
          <p className="text-[14px] text-ink-soft mb-4">
            Apply this blueprint directly to your next video draft.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link
              to="/pre-analysis"
              search={{ channel: undefined, activityId: undefined }}
              className="inline-flex items-center gap-2 rounded-xl bg-ink text-surface px-5 py-2.5 text-[13px] font-semibold hover:opacity-90 transition"
            >
              Pre-Upload Audit <ArrowRight size={14} />
            </Link>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl border border-hairline text-ink px-5 py-2.5 text-[13px] font-semibold hover:bg-ink/5 transition"
            >
              <RotateCcw size={14} />
              Analyze Another Channel
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
