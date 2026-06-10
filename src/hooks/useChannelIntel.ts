import { useEffect, useMemo } from "react";
import { buildPrefillContext } from "@/lib/youtube/prompt";
import type { ChannelIntelBundle } from "@/lib/youtube/types";
import { loadChannelIntel } from "@/lib/channel-session";

export interface ChannelPrefill {
  channelNiche: string;
  targetAudience: string;
  hookType: string;
  editingStyle: string;
  channelName: string;
  channelHandle: string;
  topVideoTitle: string;
  topVideoUrl: string;
}

export function useChannelIntelPrefill(channelParam?: string): {
  bundle: ChannelIntelBundle | null;
  prefill: ChannelPrefill | null;
  channelQuery: string | undefined;
} {
  const bundle = useMemo(() => {
    const stored = loadChannelIntel();
    if (!stored) return null;
    if (channelParam) {
      const norm = (s: string) => s.toLowerCase().replace(/^@/, "");
      const q = norm(channelParam);
      const match =
        norm(stored.queriedInput) === q ||
        norm(stored.meta.handle) === q ||
        norm(stored.meta.name) === q;
      if (!match) return null;
    }
    return stored;
  }, [channelParam]);

  const prefill = useMemo(() => (bundle ? buildPrefillContext(bundle) : null), [bundle]);

  const channelQuery = channelParam || bundle?.queriedInput?.replace(/^@/, "");

  return { bundle, prefill, channelQuery };
}

/** Apply prefill to setters once on mount when channel param or session exists. */
export function useApplyChannelPrefill(
  channelParam: string | undefined,
  apply: (prefill: ChannelPrefill) => void,
): void {
  const { prefill } = useChannelIntelPrefill(channelParam);

  useEffect(() => {
    if (prefill) apply(prefill);
  }, [prefill?.channelNiche, prefill?.targetAudience]);
}
