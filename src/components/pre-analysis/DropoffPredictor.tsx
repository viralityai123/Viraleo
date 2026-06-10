import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  formatTimestamp,
  predictDropoffs,
  type DropoffMeta,
  type DropoffMarker,
} from "@/lib/dropoff";
import { collectTrainingData, queueTrainingRecord } from "@/lib/ml/training-collector";

const sevColor: Record<DropoffMarker["severity"], string> = {
  low: "var(--color-ink-soft)",
  medium: "var(--color-watch)",
  high: "var(--color-critical)",
};

const gradeColor: Record<string, string> = {
  "A+": "var(--color-good)",
  A: "var(--color-good)",
  B: "var(--color-watch)",
  C: "var(--color-watch)",
  D: "var(--color-critical)",
  F: "var(--color-critical)",
};

function PathD(pts: { t: number; v: number }[], W: number, H: number, maxT: number) {
  return pts
    .map((p, i) => {
      const x = (p.t / maxT) * W;
      const y = H - (p.v / 100) * H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function DropoffPredictor({ meta }: { meta: DropoffMeta }) {
  const prediction = useMemo(() => predictDropoffs(meta), [meta]);
  const [active, setActive] = useState<number | null>(0);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");

  function onFeedback(vote: "positive" | "negative") {
    setFeedback(vote);
    const record = collectTrainingData(undefined, prediction, vote, feedbackNote || undefined);
    queueTrainingRecord(record);
  }

  const W = 100;
  const H = 100;

  const mainPath = useMemo(
    () => PathD(prediction.retentionCurve, W, H, meta.durationSec),
    [prediction, meta.durationSec],
  );

  const lowerPath = useMemo(
    () => PathD(prediction.lowerCurve, W, H, meta.durationSec),
    [prediction, meta.durationSec],
  );

  const upperPath = useMemo(
    () => PathD(prediction.upperCurve, W, H, meta.durationSec),
    [prediction, meta.durationSec],
  );

  const bandArea = lowerPath + ` L100,100 L0,100 Z`;
  const areaPath = mainPath + ` L100,100 L0,100 Z`;

  const hover = useMemo(() => {
    if (hoverX == null) return null;
    const pts = prediction.retentionCurve;
    const i = Math.round((hoverX / W) * (pts.length - 1));
    const p = pts[Math.max(0, Math.min(pts.length - 1, i))];
    return { t: p.t, v: p.v, x: (i / (pts.length - 1)) * W };
  }, [hoverX, prediction]);

  const allMarkers = useMemo(() => {
    const main = prediction.markers.map((m, i) => ({ ...m, index: i, isMicro: false as const }));
    const micro = prediction.microMarkers.map((m, i) => ({
      timestamp: m.timestamp,
      reason: "Micro drop" as const,
      severity: m.severity,
      fixHint: "",
      confidence: 0,
      index: i,
      isMicro: true as const,
    }));
    return [...main, ...micro].sort((a, b) => a.timestamp - b.timestamp);
  }, [prediction]);

  return (
    <section className="rounded-3xl bg-surface border border-hairline shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] p-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-[13px] font-medium text-ink flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-critical" />
            Drop-Off Predictor
          </div>
          <p className="mt-1 text-[12.5px] text-ink-soft max-w-md">
            Modeled from cut density, pacing gaps, and audio energy. Markers are the moments most
            likely to lose viewers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-[13px] font-bold tabular-nums"
            style={{ color: gradeColor[prediction.retentionGrade] }}
          >
            {prediction.retentionGrade}
          </span>
          <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft font-medium">
            Beta · v0.4
          </span>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onFeedback("positive")}
              className={`size-6 rounded-full flex items-center justify-center text-[12px] transition-all ${
                feedback === "positive"
                  ? "bg-good/15 text-good"
                  : "text-ink-soft hover:bg-surface-2"
              }`}
              title="Accurate prediction"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </button>
            <button
              onClick={() => onFeedback("negative")}
              className={`size-6 rounded-full flex items-center justify-center text-[12px] transition-all ${
                feedback === "negative"
                  ? "bg-critical/15 text-critical"
                  : "text-ink-soft hover:bg-surface-2"
              }`}
              title="Inaccurate prediction"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10Z" />
                <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        <div>
          <div className="relative">
            <div className="flex">
              <div className="flex flex-col justify-between pr-3 py-1 text-[10px] tabular-nums text-ink-soft text-right w-8">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
              </div>

              <div
                className="relative flex-1 h-44 rounded-2xl bg-gradient-to-b from-surface-2/80 to-surface border border-hairline overflow-hidden"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setHoverX(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
                }}
                onMouseLeave={() => setHoverX(null)}
              >
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  preserveAspectRatio="none"
                  className="absolute inset-0 size-full"
                >
                  <defs>
                    <linearGradient id="rg" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-good)" stopOpacity="0.4" />
                      <stop offset="60%" stopColor="var(--color-good)" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="var(--color-good)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="bg-band" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-good)" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="var(--color-good)" stopOpacity="0.03" />
                    </linearGradient>
                  </defs>

                  {[25, 50, 75].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      x2={W}
                      y1={y}
                      y2={y}
                      stroke="var(--color-hairline)"
                      strokeWidth="0.4"
                      vectorEffect="non-scaling-stroke"
                      strokeDasharray="1 2"
                    />
                  ))}

                  {/* Confidence band */}
                  <motion.path
                    d={bandArea}
                    fill="url(#bg-band)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                  />

                  {/* Upper bound line */}
                  <motion.path
                    d={upperPath}
                    fill="none"
                    stroke="var(--color-good)"
                    strokeWidth="0.3"
                    strokeDasharray="1 2"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  />

                  {/* Lower bound line */}
                  <motion.path
                    d={lowerPath}
                    fill="none"
                    stroke="var(--color-good)"
                    strokeWidth="0.3"
                    strokeDasharray="1 2"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  />

                  {/* Area fill */}
                  <motion.path
                    d={areaPath}
                    fill="url(#rg)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                  />

                  {/* Main curve */}
                  <motion.path
                    d={mainPath}
                    fill="none"
                    stroke="var(--color-good)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                  />

                  {/* Hover indicator */}
                  {hover && (
                    <>
                      <line
                        x1={hover.x}
                        x2={hover.x}
                        y1="0"
                        y2={H}
                        stroke="var(--color-ink)"
                        strokeWidth="0.4"
                        vectorEffect="non-scaling-stroke"
                        opacity="0.4"
                      />
                      <circle
                        cx={hover.x}
                        cy={H - (hover.v / 100) * H}
                        r="1.6"
                        fill="var(--color-surface)"
                        stroke="var(--color-good)"
                        strokeWidth="0.8"
                        vectorEffect="non-scaling-stroke"
                      />
                    </>
                  )}
                </svg>

                {/* Micro markers — subtle dots */}
                {prediction.microMarkers.map((m, i) => {
                  const left = (m.timestamp / meta.durationSec) * 100;
                  return (
                    <div
                      key={`micro-${i}`}
                      className="absolute top-0 bottom-0 -translate-x-1/2 pointer-events-none"
                      style={{ left: `${left}%` }}
                    >
                      <div
                        className="absolute top-1/2 -translate-y-1/2 size-1.5 rounded-full opacity-40"
                        style={{
                          backgroundColor: sevColor[m.severity],
                        }}
                      />
                    </div>
                  );
                })}

                {/* Main markers */}
                {prediction.markers.map((m, i) => {
                  const left = (m.timestamp / meta.durationSec) * 100;
                  const isActive = active === i;
                  return (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 + i * 0.1, duration: 0.4 }}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onClick={() => setActive(i)}
                      className="absolute top-0 bottom-0 -translate-x-1/2 group"
                      style={{ left: `${left}%` }}
                    >
                      <motion.div
                        className="absolute inset-y-0 w-px"
                        animate={{
                          opacity: isActive ? 1 : 0.45,
                          backgroundColor: sevColor[m.severity] as string,
                        }}
                      />
                      <motion.span
                        animate={{ scale: isActive ? 1.25 : 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                        className="absolute top-2 left-1/2 -translate-x-1/2 size-3 rounded-full border-2 border-surface shadow-md"
                        style={{ backgroundColor: sevColor[m.severity] }}
                      />
                      {isActive && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0.6 }}
                          animate={{ scale: 2.5, opacity: 0 }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="absolute top-2 left-1/2 -translate-x-1/2 size-3 rounded-full"
                          style={{ backgroundColor: sevColor[m.severity] }}
                        />
                      )}
                    </motion.button>
                  );
                })}

                {/* Hover tooltip */}
                <AnimatePresence>
                  {hover && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute pointer-events-none -translate-x-1/2 -translate-y-full top-0 mt-1 px-2.5 py-1.5 rounded-lg bg-ink text-surface text-[11px] font-medium shadow-lg whitespace-nowrap"
                      style={{ left: `${hover.x}%` }}
                    >
                      {formatTimestamp(hover.t)} · {Math.round(hover.v)}% retained
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* X-axis ruler */}
            <div className="mt-2 ml-8 flex justify-between text-[10.5px] text-ink-soft tabular-nums">
              <span>0:00</span>
              <span>{formatTimestamp(meta.durationSec * 0.25)}</span>
              <span>{formatTimestamp(meta.durationSec * 0.5)}</span>
              <span>{formatTimestamp(meta.durationSec * 0.75)}</span>
              <span>{formatTimestamp(meta.durationSec)}</span>
            </div>
          </div>

          {/* Markers list */}
          <ul className="mt-5 space-y-2">
            {prediction.markers.map((m, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.06 }}
              >
                <button
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full text-left rounded-xl border px-3.5 py-3 transition-all ${
                    active === i
                      ? "border-ink/20 bg-surface-2 shadow-sm"
                      : "border-hairline hover:border-ink/15 hover:bg-surface-2/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: sevColor[m.severity] }}
                    />
                    <span className="font-display text-[14px] font-semibold tabular-nums text-ink w-12">
                      {formatTimestamp(m.timestamp)}
                    </span>
                    <span className="text-[12.5px] text-ink font-medium">{m.reason}</span>
                    <span className="ml-auto flex items-center gap-2">
                      <span
                        className="text-[10.5px] font-semibold tabular-nums"
                        style={{ color: sevColor[m.severity] }}
                      >
                        {m.confidence}%
                      </span>
                      <span className="text-[11px] uppercase tracking-wide text-ink-soft">
                        {m.severity}
                      </span>
                    </span>
                  </div>
                  <AnimatePresence initial={false}>
                    {active === i && (
                      <motion.p
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="pl-5 text-[12.5px] leading-relaxed text-ink-soft overflow-hidden"
                      >
                        {m.fixHint}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </button>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Retention stats sidebar */}
        <div className="lg:w-48 lg:border-l lg:border-hairline lg:pl-6 space-y-4">
          {/* Grade badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "backOut" }}
            className="text-center py-3"
          >
            <div
              className="text-[28px] sm:text-[44px] font-bold font-display leading-none"
              style={{ color: gradeColor[prediction.retentionGrade] }}
            >
              {prediction.retentionGrade}
            </div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink-soft mt-1">
              Retention Grade
            </div>
          </motion.div>

          <div className="h-px bg-hairline" />

          {/* Retention points */}
          {[
            { k: "At 0:05", v: prediction.retentionAt.five },
            { k: "At 0:15", v: prediction.retentionAt.fifteen },
            { k: "At 0:30", v: prediction.retentionAt.thirty },
            ...(meta.durationSec > 60
              ? [{ k: "At 1:00" as const, v: prediction.retentionAt.sixty }]
              : []),
            { k: "Midpoint", v: prediction.retentionAt.midpoint },
            { k: "At end", v: prediction.retentionAt.end },
          ].map((r, i) => (
            <motion.div
              key={r.k}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
            >
              <div className="text-[11px] uppercase tracking-[0.08em] text-ink-soft font-medium">
                {r.k}
              </div>
              <div className="mt-0.5 font-display text-[22px] font-semibold tabular-nums text-ink">
                {r.v}
                <span className="text-ink-soft text-[13px] font-normal">%</span>
              </div>
              <div className="text-[10px] text-ink-soft">retained</div>
            </motion.div>
          ))}

          <div className="h-px bg-hairline" />

          {/* Estimated avg view duration */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink-soft font-medium">
              Avg View
            </div>
            <div className="mt-0.5 font-display text-[22px] font-semibold tabular-nums text-ink">
              {formatTimestamp(prediction.estimatedAvgViewDuration)}
            </div>
            <div className="text-[10px] text-ink-soft">estimated watch time</div>
          </motion.div>

          {/* Vs niche average */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink-soft font-medium">
              vs Niche Avg
            </div>
            <div
              className="mt-0.5 font-display text-[20px] font-semibold tabular-nums"
              style={{
                color:
                  prediction.vsNicheAverage >= 0 ? "var(--color-good)" : "var(--color-critical)",
              }}
            >
              {prediction.vsNicheAverage >= 0 ? "+" : ""}
              {prediction.vsNicheAverage}%
            </div>
            <div className="text-[10px] text-ink-soft">above niche baseline</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
