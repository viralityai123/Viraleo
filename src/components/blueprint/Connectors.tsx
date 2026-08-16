import { cn } from "@/lib/utils";

/**
 * A vertical animated connector line with an arrowhead, drawn when `active`.
 */
export function VConnector({
  active,
  height = 44,
  className,
}: {
  active: boolean;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex justify-center", className)}
      style={{ height }}
      aria-hidden
    >
      <svg width="16" height={height} viewBox={`0 0 16 ${height}`} fill="none">
        <line
          x1="8"
          y1="0"
          x2="8"
          y2={height - 7}
          stroke="var(--bp-win)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            strokeDasharray: height,
            strokeDashoffset: active ? 0 : height,
            transition: "stroke-dashoffset 0.7s ease-out",
          }}
        />
        <path
          d={`M4 ${height - 10} L8 ${height - 4} L12 ${height - 10}`}
          stroke="var(--bp-win)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: active ? 1 : 0,
            transition: "opacity 0.3s ease-out 0.5s",
          }}
        />
      </svg>
    </div>
  );
}

/**
 * Splitting connector: one line coming down then branching to N columns.
 * Purely decorative; hidden on small screens where nodes stack vertically.
 */
export function BranchConnector({
  active,
  columns = 3,
}: {
  active: boolean;
  columns?: number;
}) {
  const width = 900;
  const height = 70;
  const step = width / (columns + 1);
  const points = Array.from({ length: columns }, (_, i) => step * (i + 1));
  const center = width / 2;

  return (
    <div className="hidden justify-center md:flex" aria-hidden>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ maxWidth: width, height }}
        fill="none"
      >
        {/* stem */}
        <line
          x1={center}
          y1="0"
          x2={center}
          y2="22"
          stroke="var(--bp-win)"
          strokeWidth="2"
          style={{
            strokeDasharray: 30,
            strokeDashoffset: active ? 0 : 30,
            transition: "stroke-dashoffset 0.5s ease-out",
          }}
        />
        {points.map((x, i) => (
          <path
            key={i}
            d={`M${center} 22 C ${center} 46, ${x} 40, ${x} ${height - 8}`}
            stroke="var(--bp-win)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              strokeDasharray: 160,
              strokeDashoffset: active ? 0 : 160,
              transition: `stroke-dashoffset 0.7s ease-out ${0.2 + i * 0.12}s`,
            }}
          />
        ))}
        {points.map((x, i) => (
          <path
            key={`a-${i}`}
            d={`M${x - 4} ${height - 12} L${x} ${height - 6} L${x + 4} ${height - 12}`}
            stroke="var(--bp-win)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity: active ? 1 : 0,
              transition: `opacity 0.3s ease-out ${0.7 + i * 0.12}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
