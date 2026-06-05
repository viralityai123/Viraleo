interface Stat {
  label: string;
  value: string;
  caption: string;
  tone?: "good" | "watch" | "critical";
}

export function FileInfo({ stats }: { stats: Stat[] }) {
  return (
    <section className="rounded-3xl bg-surface border border-hairline shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] p-6">
      <div className="text-[13px] font-medium text-ink mb-4 flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-ink" />
        File Info
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink-soft font-medium">
              {s.label}
            </div>
            <div className="mt-1 font-display text-[20px] font-semibold tracking-tight text-ink">
              {s.value}
            </div>
            <div
              className="text-[12px]"
              style={{
                color: s.tone ? `var(--color-${s.tone})` : "var(--color-ink-soft)",
              }}
            >
              {s.caption}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
