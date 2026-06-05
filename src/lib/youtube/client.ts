export function getYoutubeApiKey(): string {
  return process.env.YOUTUBE_API_KEY || "";
}

export function requireYoutubeApiKey(): string {
  const key = getYoutubeApiKey().trim();
  if (!key) {
    throw new Error("YOUTUBE_API_KEY_REQUIRED");
  }
  if (key.includes(".apps.googleusercontent.com") || key.includes("googleusercontent.com")) {
    throw new Error("YOUTUBE_API_KEY_IS_OAUTH_CLIENT_ID");
  }
  if (!key.startsWith("AIzaSy")) {
    throw new Error("YOUTUBE_API_KEY_INVALID_FORMAT");
  }
  return key;
}

export async function ytFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = requireYoutubeApiKey();
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    
    // Check for specific API key or enablement errors
    if (body.includes("API_KEY_INVALID") || body.includes("API key not valid") || body.includes("keyInvalid")) {
      throw new Error("YOUTUBE_API_KEY_INVALID");
    }
    if (body.includes("Access Not Configured") || body.includes("youtube.googleapis.com has not been used") || body.includes("disabled")) {
      throw new Error("YOUTUBE_API_NOT_ENABLED");
    }
    
    throw new Error(`YouTube API ${path} failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export function parseIsoDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || "0", 10);
  const m = parseInt(match[2] || "0", 10);
  const s = parseInt(match[3] || "0", 10);
  return h * 3600 + m * 60 + s;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

export function normalizeHandle(s: string): string {
  return s.toLowerCase().replace(/^@/, "").replace(/[\s\-_.]/g, "");
}

export function extractChannelQuery(input: string): string {
  const clean = input.replace(/^https?:\/\/(www\.)?youtube\.com\//, "").replace(/^@/, "");
  return clean.split(/[/?#]/)[0] || "channel";
}

export function extractVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function isLikelyChannelInput(input: string): boolean {
  const trimmed = input.trim();
  if (extractVideoId(trimmed)) return false;
  if (/youtube\.com\/(channel|c|@|user)\//i.test(trimmed)) return true;
  if (trimmed.startsWith("@")) return true;
  if (!trimmed.includes(" ") && trimmed.length > 0 && trimmed.length < 80) return true;
  return false;
}
