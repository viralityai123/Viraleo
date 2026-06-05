interface Diagnostic {
  title: string;
  body: string;
  level: "critical" | "warning" | "ok";
}

export function Diagnostics({ items }: { items: Diagnostic[] }) {
  const crit = items.filter((i) => i.level === "critical").length;
  const warn = items.filter((i) => i.level === "warning").length;
  return (
    <section className="rounded-3xl bg-surface border border-hairline shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[13px] font-medium text-ink flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-ink" />
          Diagnostics
        </div>
        <div className="text-[12px] text-ink-soft">
          {crit} critical · {warn} warnings
        </div>
      </div>
      <ul className="space-y-4">
        {items.map((d) => {
          const dot =
            d.level === "critical"
              ? "bg-critical"
              : d.level === "warning"
                ? "bg-watch"
                : "bg-good";
          return (
            <li key={d.title} className="flex gap-3">
              <span className={`mt-1.5 size-2 rounded-full shrink-0 ${dot}`} />
              <div>
                <div className="text-[13.5px] font-medium text-ink">
                  {d.title}
                  {d.level === "ok" && (
                    <span className="ml-1 text-good">✓</span>
                  )}
                </div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
                  {d.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
