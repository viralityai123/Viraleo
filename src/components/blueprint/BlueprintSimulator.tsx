import { useState } from "react";
import { motion } from "framer-motion";
import { Sliders, Sparkles, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import type { ChannelBlueprint } from "@/lib/youtube/blueprint-server";

export function BlueprintSimulator({ blueprint }: { blueprint: ChannelBlueprint }) {
  const [topicMatch, setTopicMatch] = useState<"winning" | "adjacent" | "off">("winning");
  const [lengthChoice, setLengthChoice] = useState<"optimal" | "extended" | "short">("optimal");
  const [titleType, setTitleType] = useState<"curiosity" | "question" | "generic">("curiosity");
  const [thumbChoice, setThumbChoice] = useState<"highContrast" | "objectFocus" | "busy">("highContrast");

  // Multiplier math engine based on choices
  let winRateScore = blueprint.winningTopic.winRate;
  let viewMultiplier = blueprint.flowSummary.outlierMultiplier;

  if (topicMatch === "adjacent") {
    winRateScore *= 0.72;
    viewMultiplier *= 0.65;
  } else if (topicMatch === "off") {
    winRateScore *= 0.35;
    viewMultiplier *= 0.3;
  }

  if (lengthChoice === "extended") {
    winRateScore *= 0.85;
    viewMultiplier *= 0.8;
  } else if (lengthChoice === "short") {
    winRateScore *= 0.5;
    viewMultiplier *= 0.45;
  }

  if (titleType === "question") {
    winRateScore *= 0.88;
    viewMultiplier *= 0.85;
  } else if (titleType === "generic") {
    winRateScore *= 0.45;
    viewMultiplier *= 0.4;
  }

  if (thumbChoice === "objectFocus") {
    winRateScore *= 0.9;
    viewMultiplier *= 0.88;
  } else if (thumbChoice === "busy") {
    winRateScore *= 0.4;
    viewMultiplier *= 0.35;
  }

  const finalWinRate = Math.min(99, Math.max(12, Math.round(winRateScore)));
  const finalMultiplier = Math.max(0.2, Math.round(viewMultiplier * 10) / 10);
  const projectedViews = Math.round(blueprint.flowSummary.baselineMedianViews * finalMultiplier);

  return (
    <div className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8 shadow-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
          <Sliders size={20} />
        </div>
        <div>
          <h3 className="font-display font-bold text-ink text-lg sm:text-xl">
            Interactive Strategy Simulator
          </h3>
          <p className="text-xs text-ink-soft">
            Simulate your next video's projected performance before you record
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Controls */}
        <div className="space-y-5 text-xs">
          {/* Topic Select */}
          <div>
            <label className="block text-ink font-semibold mb-2 uppercase tracking-wider text-[11px]">
              1. Topic Angle
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "winning", label: blueprint.winningTopic.topic, sub: "Winning Cluster" },
                { id: "adjacent", label: "Adjacent Topic", sub: "1.2x Baseline" },
                { id: "off", label: "Off-Niche", sub: "High Risk" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTopicMatch(t.id as any)}
                  className={`p-2.5 rounded-2xl border text-left transition ${
                    topicMatch === t.id
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 font-semibold"
                      : "bg-surface-2 border-hairline text-ink-soft hover:text-ink"
                  }`}
                >
                  <div className="truncate font-medium">{t.label}</div>
                  <div className="text-[10px] opacity-75">{t.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Length Select */}
          <div>
            <label className="block text-ink font-semibold mb-2 uppercase tracking-wider text-[11px]">
              2. Target Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "optimal", label: blueprint.winningLength.bucket, sub: "Optimal" },
                { id: "extended", label: "Extended", sub: "Long-form" },
                { id: "short", label: "Under 4 min", sub: "Low Session" },
              ].map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLengthChoice(l.id as any)}
                  className={`p-2.5 rounded-2xl border text-left transition ${
                    lengthChoice === l.id
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 font-semibold"
                      : "bg-surface-2 border-hairline text-ink-soft hover:text-ink"
                  }`}
                >
                  <div className="truncate font-medium">{l.label}</div>
                  <div className="text-[10px] opacity-75">{l.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title Strategy */}
          <div>
            <label className="block text-ink font-semibold mb-2 uppercase tracking-wider text-[11px]">
              3. Title Framework
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "curiosity", label: "Curiosity + Proof", sub: "Top Pattern" },
                { id: "question", label: "Question Hook", sub: "Solid" },
                { id: "generic", label: "Generic / Passive", sub: "Weak CTR" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setTitleType(st.id as any)}
                  className={`p-2.5 rounded-2xl border text-left transition ${
                    titleType === st.id
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 font-semibold"
                      : "bg-surface-2 border-hairline text-ink-soft hover:text-ink"
                  }`}
                >
                  <div className="truncate font-medium">{st.label}</div>
                  <div className="text-[10px] opacity-75">{st.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Thumbnail Choice */}
          <div>
            <label className="block text-ink font-semibold mb-2 uppercase tracking-wider text-[11px]">
              4. Thumbnail Composition
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "highContrast", label: "High Contrast Face", sub: "Recommended" },
                { id: "objectFocus", label: "Object Focus", sub: "Good Mobile" },
                { id: "busy", label: "Busy (>4 words)", sub: "High Bounce" },
              ].map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setThumbChoice(th.id as any)}
                  className={`p-2.5 rounded-2xl border text-left transition ${
                    thumbChoice === th.id
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 font-semibold"
                      : "bg-surface-2 border-hairline text-ink-soft hover:text-ink"
                  }`}
                >
                  <div className="truncate font-medium">{th.label}</div>
                  <div className="text-[10px] opacity-75">{th.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Projected Scorecard */}
        <div className="rounded-3xl border border-hairline bg-surface-2 p-6 space-y-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft flex items-center justify-between">
            <span>Simulation Projection</span>
            <Sparkles size={14} className="text-emerald-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-surface border border-hairline">
              <span className="text-[10px] text-ink-soft uppercase tracking-wider font-medium block">
                Algorithmic Win Rate
              </span>
              <div className="mt-1 text-2xl font-display font-bold text-emerald-600">
                {finalWinRate}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-hairline">
              <span className="text-[10px] text-ink-soft uppercase tracking-wider font-medium block">
                Leverage Multiplier
              </span>
              <div className="mt-1 text-2xl font-display font-bold text-ink">
                {finalMultiplier}x <span className="text-xs text-ink-soft font-normal">median</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-xs text-emerald-800 font-medium">Estimated View Potential</span>
            <div className="text-3xl font-display font-bold text-emerald-700 mt-1">
              ~{projectedViews.toLocaleString()} <span className="text-sm font-normal">views</span>
            </div>
          </div>

          {finalWinRate >= 75 ? (
            <div className="flex items-start gap-2.5 text-xs text-emerald-800 bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Optimal Formula Lock!</strong> This strategy aligns with top 15% outlier signals for {blueprint.channelName}.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 text-xs text-amber-800 bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Sub-optimal Combo:</strong> Deviating from winning topic/length parameters reduces leverage significantly.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
