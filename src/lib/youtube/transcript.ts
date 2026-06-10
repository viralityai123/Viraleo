export interface TranscriptLine {
  startSec: number;
  text: string;
}

function parseJson3Captions(body: string): TranscriptLine[] {
  try {
    const data = JSON.parse(body) as {
      events?: { tStartMs?: number; segs?: { utf8?: string }[] }[];
    };
    const lines: TranscriptLine[] = [];
    for (const ev of data.events || []) {
      const text = (ev.segs || [])
        .map((s) => s.utf8 || "")
        .join("")
        .trim();
      if (!text) continue;
      lines.push({
        startSec: Math.round((ev.tStartMs || 0) / 1000),
        text: text.replace(/\n/g, " "),
      });
    }
    return lines;
  } catch {
    return [];
  }
}

function extractCaptionBaseUrl(html: string): string | null {
  const marker = '"captionTracks":';
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const start = idx + marker.length;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        try {
          const tracks = JSON.parse(html.slice(start, i + 1)) as {
            baseUrl?: string;
            languageCode?: string;
            kind?: string;
          }[];
          const en =
            tracks.find((t) => t.languageCode === "en" && t.kind !== "asr") ||
            tracks.find((t) => t.languageCode?.startsWith("en")) ||
            tracks[0];
          return en?.baseUrl?.replace(/\\u0026/g, "&") || null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Public auto-captions when available (no OAuth). */
export async function fetchVideoTranscript(videoId: string): Promise<TranscriptLine[] | null> {
  try {
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!watchRes.ok) return null;
    const html = await watchRes.text();
    const baseUrl = extractCaptionBaseUrl(html);
    if (!baseUrl) return null;

    const capUrl = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=json3`;
    const capRes = await fetch(capUrl);
    if (!capRes.ok) return null;
    const lines = parseJson3Captions(await capRes.text());
    return lines.length ? lines : null;
  } catch (e) {
    console.warn(`Transcript fetch failed for ${videoId}:`, e);
    return null;
  }
}

export function buildTranscriptPromptBlock(
  lines: TranscriptLine[] | null,
  videoTitle: string,
): string {
  if (!lines?.length) {
    return `TRANSCRIPT: unavailable for "${videoTitle}" — do NOT invent spoken lines or frame-accurate cuts.`;
  }
  const excerpt = lines
    .filter((_, i) => i % 2 === 0 || lines.length < 40)
    .slice(0, 48)
    .map((l) => `[${l.startSec}s] ${l.text.slice(0, 140)}`)
    .join("\n");
  return `TRANSCRIPT (reference video — cite these for hook dialogue only):\n${excerpt}`;
}

export function transcriptHookLines(lines: TranscriptLine[], maxSec = 8): string {
  return lines
    .filter((l) => l.startSec <= maxSec)
    .map((l) => l.text)
    .join(" ")
    .slice(0, 280);
}
