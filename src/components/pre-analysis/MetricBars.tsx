import { motion } from "framer-motion";

interface Metric {
  label: string;
  score: number;
  copy: string;
}

const toneFor = (s: number, max: number) => {
  const pct = (s / max) * 100;
  return pct >= 80 ? "good" : pct >= 60 ? "watch" : "critical";
};

export function MetricBars({ metrics, maxScore = 10 }: { metrics: Metric[]; maxScore?: number }) {
  return (
    <section className="rounded-3xl bg-surface border border-hairline shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] p-6 space-y-5">
      {metrics.map((m, i) => {
        const tone = toneFor(m.score, maxScore);
        const barPct = Math.min(100, (m.score / maxScore) * 100);
        return (
          <div key={m.label}>
            <div className="flex items-baseline justify-between">
              <div className="text-[14px] font-medium text-ink">{m.label}</div>
              <div
                className="font-display text-[15px] font-semibold tabular-nums"
                style={{ color: `var(--color-${tone})` }}
              >
                {m.score}
                <span className="text-ink-soft font-normal">/{maxScore}</span>
              </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: `var(--color-${tone})` }}
                initial={{ width: 0 }}
                animate={{ width: `${barPct}%` }}
                transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
              {m.copy}
            </p>
          </div>
        );
      })}
    </section>
  );
}
