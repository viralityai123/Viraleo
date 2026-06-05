import { motion } from "framer-motion";

interface Props {
  score: number;
  grade: string;
  headline: string;
  summary: string;
}

export function ScoreRing({
  score,
  grade,
  headline,
  summary,
  maxScore = 10,
}: Props & { maxScore?: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, (score / maxScore) * 100);
  const offset = c - (pct / 100) * c;

  return (
    <section className="rounded-3xl bg-surface border border-hairline shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] p-6">
      <div className="flex items-center gap-6">
        <div className="relative size-[132px] shrink-0">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="var(--color-hairline)"
              strokeWidth="6"
            />
            <motion.circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="var(--color-good)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-[28px] font-semibold text-good">
              {grade}
            </span>
          </div>
        </div>
        <div>
          <div className="font-display text-[44px] leading-none font-semibold tracking-tight text-ink">
            {score}
            <span className="text-ink-soft text-[22px] font-normal">/{maxScore}</span>
          </div>
          <div className="mt-1 text-[14px] text-ink-soft">{headline}</div>
        </div>
      </div>
      <p className="mt-5 text-[13px] leading-relaxed text-ink-soft">{summary}</p>
    </section>
  );
}
