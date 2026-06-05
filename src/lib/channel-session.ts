import type { ChannelIntelBundle } from "@/lib/youtube/types";

const STORAGE_KEY = "viraleo:channelIntel";
const TTL_MS = 30 * 60 * 1000;

interface StoredIntel {
  bundle: ChannelIntelBundle;
  savedAt: number;
}

export function saveChannelIntel(bundle: ChannelIntelBundle): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload: StoredIntel = { bundle, savedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("Failed to save channel intel to session:", e);
  }
}

export function loadChannelIntel(): ChannelIntelBundle | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredIntel;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.bundle;
  } catch {
    return null;
  }
}

export function getSessionChannelHandle(): string | null {
  const bundle = loadChannelIntel();
  if (!bundle) return null;
  return bundle.meta.handle || bundle.queriedInput;
}

/** Strip duplicate @ and whitespace from channel handles in URLs/forms. */
export function normalizeChannelInput(input: string): string {
  return input.trim().replace(/^@+/, "").replace(/\/$/, "");
}

export function channelSearchFromIntel(): { channel: string | undefined } {
  const handle = getSessionChannelHandle();
  return { channel: handle ? normalizeChannelInput(handle) : undefined };
}
