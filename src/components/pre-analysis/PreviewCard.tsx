import { useState } from "react";

export interface VideoMeta {
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  url: string;
  type: string;
}

export function PreviewCard({ meta }: { meta: VideoMeta | null }) {
  const [safe, setSafe] = useState(false);
  const isShort = meta ? meta.height > meta.width : true;
  return (
    <section className="rounded-3xl bg-surface border border-hairline shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
          <span className="size-1.5 rounded-full bg-good" />
          Preview
          <span className="text-ink-soft font-normal ml-1">
            {isShort ? "Shorts 9:16" : "Long-form 16:9"}
          </span>
        </div>
        <button
          onClick={() => setSafe((s) => !s)}
          className="text-[12px] text-ink-soft hover:text-ink transition"
        >
          {safe ? "Hide" : "Show"} UI Safe Zones
        </button>
      </div>
      <div
        className="relative mx-auto rounded-2xl overflow-hidden bg-ink"
        style={{
          aspectRatio: isShort ? "9/16" : "16/9",
          maxWidth: isShort ? "260px" : "100%",
        }}
      >
        {meta ? (
          <video src={meta.url} controls playsInline className="w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#3a5a3a] via-[#1a2d1a] to-[#0a0a0a]" />
        )}
        {safe && isShort && (
          <>
            <div className="absolute pointer-events-none inset-x-0 top-0 h-[14%] bg-watch/20 border-b border-watch/70 flex items-center justify-center text-[10px] text-white font-bold bg-black/30">
              TOP OVERLAY (AVATAR/SEARCH)
            </div>
            <div className="absolute pointer-events-none inset-x-0 bottom-0 h-[18%] bg-watch/20 border-t border-watch/70 flex items-center justify-center text-[10px] text-white font-bold bg-black/30">
              BOTTOM OVERLAY (TITLE/MUSIC)
            </div>
            <div className="absolute pointer-events-none inset-y-0 right-0 w-[16%] bg-watch/20 border-l border-watch/70 flex items-center justify-center text-[10px] text-white font-bold bg-black/30 [writing-mode:vertical-lr]">
              RIGHT OVERLAY (LIKE/SHARE)
            </div>
          </>
        )}
        {safe && !isShort && (
          <div className="absolute pointer-events-none inset-0 border-4 border-dashed border-watch/70 bg-watch/10 flex items-center justify-center text-[11px] text-white font-bold bg-black/30">
            16:9 Widescreen Safe Zone
          </div>
        )}
      </div>
    </section>
  );
}
