import { cn } from "@/lib/utils";

type Tone = "default" | "highlight" | "win" | "muted";
type Confidence = "High" | "Medium" | "Low";

const toneStyles: Record<Tone, string> = {
  default: "bg-white border-gray-200",
  muted: "bg-gray-50 border-gray-200 text-gray-500",
  highlight: "bg-emerald-50 border-emerald-200/60",
  win: "bg-gray-900 text-white border-gray-900",
};

export interface FlowNodeData {
  id: string;
  emoji?: string;
  label: string;
  detail?: string;
  pattern?: string;
  evidence?: string;
  winRate?: number;
  impact?: string;
  confidence?: Confidence;
  tone?: Tone;
}

interface FlowNodeProps {
  node: FlowNodeData;
  className?: string;
  compact?: boolean;
}

export function FlowNode({ node, className, compact }: FlowNodeProps) {
  const tone = node.tone ?? "default";
  const isWin = tone === "win";

  return (
    <div
      className={cn(
        "group relative rounded-2xl border px-5 py-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-1",
        compact ? "min-w-[150px]" : "min-w-[190px]",
        toneStyles[tone],
        isWin && "bp-trophy-glow",
        className,
      )}
    >
      {node.emoji && (
        <div className={cn("mb-1 text-2xl", isWin && "bp-float-soft")}>
          {node.emoji}
        </div>
      )}
      <div
        className={cn(
          "font-semibold leading-tight",
          compact ? "text-sm" : "text-base",
          tone === "highlight" && "text-emerald-700",
          isWin && "text-white",
        )}
      >
        {node.label}
      </div>
      {node.detail && (
        <div
          className={cn(
            "mt-1 text-xs leading-snug",
            isWin ? "text-white/70" : "text-gray-500",
          )}
        >
          {node.detail}
        </div>
      )}

      {(node.pattern || node.winRate != null || node.impact || node.evidence) && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {node.pattern && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-700">
              {node.pattern}
            </span>
          )}
          {node.winRate != null && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700">
              {node.winRate}% win
            </span>
          )}
          {node.impact && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-500">
              {node.impact}
            </span>
          )}
        </div>
      )}
      {node.evidence && (
        <div className="mt-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {node.evidence}
          {node.confidence && ` · ${node.confidence} confidence`}
        </div>
      )}
    </div>
  );
}
