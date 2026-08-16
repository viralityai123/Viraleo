import { motion } from "framer-motion";
import { ShieldAlert, Zap, Type, Image as ImageIcon, Sparkles, AlertTriangle } from "lucide-react";
import type { AdvancedMetrics } from "@/lib/youtube/blueprint-server";

export function AdvancedMetricsCard({ metrics }: { metrics: AdvancedMetrics }) {
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Top grid: Title Syntax & Thumbnail Composition */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Title Syntax */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-hairline bg-surface p-6 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="size-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <Type size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-ink text-[15px]">Title Syntax & Mechanics</h3>
              <p className="text-[11px] text-ink-soft">Mathematical breakdown of outlier titles</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-2 border border-hairline">
              <span className="text-ink-soft">Optimal Title Length</span>
              <span className="font-mono font-bold text-ink text-[13px]">
                {metrics.titleSyntax.avgCharCount} characters
              </span>
            </div>

            <div>
              <span className="text-[11px] text-ink-soft block mb-2 font-medium uppercase tracking-wider">
                Top High-Leverage Power Words
              </span>
              <div className="flex flex-wrap gap-1.5">
                {metrics.titleSyntax.topPowerWords.map((word) => (
                  <span
                    key={word}
                    className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-mono text-[11px] font-semibold"
                  >
                    "{word}"
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-ink-soft">Question vs Curiosity Statement Ratio</span>
                <span className="font-mono font-semibold text-ink">
                  {metrics.titleSyntax.questionRatio}% Questions
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden flex">
                <div
                  className="bg-blue-500 h-full transition-all duration-700"
                  style={{ width: `${metrics.titleSyntax.questionRatio}%` }}
                />
                <div
                  className="bg-emerald-500 h-full transition-all duration-700"
                  style={{ width: `${100 - metrics.titleSyntax.questionRatio}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-ink-soft/70 font-mono">
                <span>Questions ({metrics.titleSyntax.questionRatio}%)</span>
                <span>Curiosity Direct ({100 - metrics.titleSyntax.questionRatio}%)</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Thumbnail Composition */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="rounded-3xl border border-hairline bg-surface p-6 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="size-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-ink text-[15px]">Thumbnail Visual Rules</h3>
              <p className="text-[11px] text-ink-soft">Feed contrast & focal composition</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3 rounded-2xl bg-surface-2 border border-hairline flex items-center justify-between">
              <span className="text-ink-soft">Focal Composition</span>
              <span className="font-semibold text-ink">{metrics.thumbnailRules.faceDensity}</span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-2 border border-hairline flex items-center justify-between">
              <span className="text-ink-soft">Text Overlay Word Limit</span>
              <span className="font-mono font-bold text-amber-600">
                ≤ {metrics.thumbnailRules.wordCountLimit} words max
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-ink-soft">Visual Contrast & Clarity Rating</span>
                <span className="font-mono font-semibold text-emerald-600">
                  {metrics.thumbnailRules.visualContrastScore}/100
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${metrics.thumbnailRules.visualContrastScore}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Retention Architecture (First 30s) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className="rounded-3xl border border-hairline bg-surface p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-ink text-[15px]">30-Second Hook Retention Architecture</h3>
            <p className="text-[11px] text-ink-soft">Exact structural flow used to lock in early retention</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                Phase 1 (0:00 – 0:15)
              </span>
              <Sparkles size={13} className="text-emerald-600" />
            </div>
            <p className="text-xs font-medium text-ink leading-snug">
              {metrics.hookArchitecture.first15s}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                Phase 2 (0:15 – 0:30)
              </span>
              <Zap size={13} className="text-blue-600" />
            </div>
            <p className="text-xs font-medium text-ink leading-snug">
              {metrics.hookArchitecture.sec15to30}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-purple-700 tracking-wider">
                Pacing Interrupt
              </span>
              <Type size={13} className="text-purple-600" />
            </div>
            <p className="text-xs font-medium text-ink leading-snug">
              {metrics.hookArchitecture.patternInterruptCadence}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Anti-Patterns ("Growth Traps") */}
      {metrics.antiPatterns && metrics.antiPatterns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16 }}
          className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="size-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-rose-950 dark:text-rose-200 text-[15px]">
                Detected Anti-Patterns (Growth Traps)
              </h3>
              <p className="text-[11px] text-rose-700/80">
                Known mistakes on this channel that trigger severe view crashes
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {metrics.antiPatterns.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-surface border border-rose-200/60 dark:border-rose-900/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-rose-600 flex items-center gap-1.5">
                    <ShieldAlert size={14} />
                    {item.flag}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-full">
                    {item.impact}
                  </span>
                </div>
                <p className="text-[12px] text-ink-soft leading-relaxed">{item.reason}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
