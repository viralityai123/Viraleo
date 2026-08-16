import { cn } from "@/lib/utils";
import type { BlueprintDecisionStep, BlueprintDecisionOption } from "@/lib/youtube/blueprint-server";
import { useInView } from "@/hooks/blueprint/useInView";
import { VConnector } from "./Connectors";

const toneStyles: Record<BlueprintDecisionOption["tone"], string> = {
  win: "border-emerald-300/60 bg-emerald-50",
  ok: "border-gray-200 bg-white",
  weak: "border-gray-200 bg-gray-50 text-gray-400",
};

const chipStyles: Record<BlueprintDecisionOption["tone"], string> = {
  win: "bg-emerald-500 text-white",
  ok: "bg-gray-100 text-gray-700",
  weak: "bg-gray-200 text-gray-400",
};

function StepCard({ step, index }: { step: BlueprintDecisionStep; index: number }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });

  return (
    <div className="flex flex-col items-center">
      {index > 0 && <VConnector active={inView} height={40} />}
      <div
        ref={ref}
        className={cn(
          "w-full max-w-2xl rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur transition-all duration-500",
          inView ? "bp-rise" : "opacity-0",
        )}
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 font-mono text-xs text-white">
            {index + 1}
          </span>
          <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {step.options.map((opt, i) => (
            <div
              key={opt.label}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                toneStyles[opt.tone],
                inView ? "opacity-100" : "opacity-0",
              )}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <span className="font-medium text-gray-900">{opt.label}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-semibold",
                  chipStyles[opt.tone],
                )}
              >
                {opt.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DecisionTree({ steps }: { steps: BlueprintDecisionStep[] }) {
  const start = useInView<HTMLDivElement>({ threshold: 0.4 });
  const end = useInView<HTMLDivElement>({ threshold: 0.4 });

  return (
    <div className="flex flex-col items-center">
      <div
        ref={start.ref}
        className={cn(
          "rounded-full border border-gray-900 bg-gray-900 px-6 py-3 font-semibold text-white shadow-md transition-all duration-500",
          start.inView ? "bp-rise" : "opacity-0",
        )}
      >
        New Video
      </div>
      <VConnector active={start.inView} height={40} />

      {steps.map((step, i) => (
        <StepCard key={step.id} step={step} index={i} />
      ))}

      <VConnector active={end.inView} height={40} />
      <div
        ref={end.ref}
        className={cn(
          "rounded-2xl border border-emerald-300/60 bg-emerald-50 px-8 py-5 text-center shadow-md transition-all duration-500",
          end.inView ? "bp-rise" : "opacity-0",
        )}
      >
        <div className="mb-1 text-2xl bp-float-soft">📈</div>
        <div className="text-lg font-semibold text-gray-900">Expected Performance</div>
        <div className="text-sm text-gray-500">High win-rate, above-median views</div>
      </div>
    </div>
  );
}
