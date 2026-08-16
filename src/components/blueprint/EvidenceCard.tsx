import { cn } from "@/lib/utils";
import type { BlueprintEvidenceSection } from "@/lib/youtube/blueprint-server";
import { useInView } from "@/hooks/blueprint/useInView";
import { useCountUp } from "@/hooks/blueprint/useCountUp";

function StatRow({ stat, active }: { stat: BlueprintEvidenceSection["stats"][number]; active: boolean }) {
  const decimals = Number.isInteger(stat.value) ? 0 : 1;
  const value = useCountUp(stat.value, active, { decimals });

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-gray-500">{stat.label}</span>
        <span className="text-sm font-semibold tabular-nums text-gray-900">
          {value}
          {stat.suffix}
        </span>
      </div>
      {stat.isBar && (
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000 ease-out"
            style={{ width: active ? `${Math.min(stat.value, 100)}%` : "0%" }}
          />
        </div>
      )}
    </div>
  );
}

export function EvidenceCard({
  section,
  index,
}: {
  section: BlueprintEvidenceSection;
  index: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.25 });
  const confidence = useCountUp(section.confidence, inView);

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
        inView ? "bp-rise" : "opacity-0",
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-gray-100 px-3 py-1 font-mono text-xs uppercase tracking-wide text-gray-700">
          {section.title}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {confidence}% confidence
        </span>
      </div>

      <p className="mt-4 text-lg font-medium leading-snug text-gray-900">
        {section.headline}
      </p>

      <div className="mt-5 space-y-4">
        {section.stats.map((stat) => (
          <StatRow key={stat.label} stat={stat} active={inView} />
        ))}
      </div>
    </div>
  );
}
