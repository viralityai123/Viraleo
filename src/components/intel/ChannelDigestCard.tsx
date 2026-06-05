export function ChannelDigestCard({
  digest,
  hasTranscript,
  className = "",
}: {
  digest?: { headline?: string; bullets?: string[] };
  hasTranscript?: boolean;
  className?: string;
}) {
  if (!digest?.headline) return null;

  return (
    <div
      className={`rounded-2xl border border-[#FACC15]/30 bg-gradient-to-r from-[#FACC15]/10 to-emerald-50 px-5 py-4 ${className}`}
    >
      <p className="text-[15px] font-bold text-ink leading-snug">{digest.headline}</p>
      {digest.bullets && digest.bullets.length > 0 && (
        <ul className="mt-2 space-y-1 text-[13px] text-ink-soft">
          {digest.bullets.map((b, i) => (
            <li key={i}>• {b}</li>
          ))}
        </ul>
      )}
      {hasTranscript && (
        <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
          Caption-grounded
        </span>
      )}
    </div>
  );
}

export function DataReceiptsStrip({ receipts }: { receipts?: string[] }) {
  if (!receipts?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {receipts.map((r, i) => (
        <span
          key={i}
          className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800"
        >
          {r}
        </span>
      ))}
    </div>
  );
}
