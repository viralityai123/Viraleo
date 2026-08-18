import { THREADS_CONFIG } from "./config";
import { hasBuyingIntent, EXCLUDED_TERMS } from "./taxonomy";
import { isSeen } from "./store";
import type { ThreadsRawPost } from "./types";

/**
 * Reddit lead hunting: pulls each job-oriented subreddit's newest posts via
 * the RSS endpoint (new.rss). One request per subreddit — cheap on rate
 * limits and works from IPs where the JSON API returns 403.
 */

const REDDIT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export const REDDIT_SUBREDDITS = [
  "forhire",
  "designjobs",
  "web_design",
  "freelance",
  "LogoRequests",
  "smallbusiness",
  "Entrepreneur",
  "startups",
  "business",
  "jobs",
  "DesignerJobs",
  "WebDevBuddies",
];

/** Prefix so Threads/Reddit post ids never collide in the shared seen set. */
export function redditPostId(id: string): string {
  return `rd:${id}`;
}

function unescape(s: string): string {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function stripHtml(s: string): string {
  return unescape(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

interface RssEntry {
  title: string;
  link: string;
  id: string;
  author: string;
  published: string;
  content: string;
}

function parseEntries(xml: string): RssEntry[] {
  const out: RssEntry[] = [];
  const parts = xml.split("<entry>");
  for (let i = 1; i < parts.length; i++) {
    const e = parts[i];
    const end = e.indexOf("</entry>");
    const body = end === -1 ? e : e.slice(0, end);
    const get = (tag: string) => {
      const m = body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? m[1] : "";
    };
    const linkM = body.match(/<link href="([^"]+)"/);
    const idM = body.match(/<id>([^<]+)<\/id>/);
    if (!linkM || !idM) continue;
    out.push({
      title: unescape(get("title")),
      link: linkM[1],
      id: idM[1].trim(),
      author: unescape(get("name")),
      published: get("published"),
      content: stripHtml(get("content")),
    });
  }
  return out;
}

async function fetchRss(url: string): Promise<{ ok: boolean; xml: string | null; blocked: boolean }> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": REDDIT_UA },
      signal: AbortSignal.timeout(THREADS_CONFIG.fetchTimeoutMs),
    });
    if (res.status === 429 || res.status === 403) return { ok: false, xml: null, blocked: true };
    if (!res.ok) return { ok: false, xml: null, blocked: false };
    const xml = await res.text();
    return { ok: xml.includes("<entry>"), xml, blocked: false };
  } catch {
    return { ok: false, xml: null, blocked: false };
  }
}

function mapPost(e: RssEntry): ThreadsRawPost | null {
  if (!e.id || !e.link) return null;
  const id = redditPostId(e.id);
  const text = `${e.title} ${e.content}`.trim().slice(0, 1000);
  if (text.length < 10) return null;
  let takenAt: number | undefined;
  const t = Date.parse(e.published);
  if (Number.isFinite(t)) takenAt = t / 1000;
  return {
    id,
    username: e.author.replace(/^u\//, "") || "unknown",
    text,
    takenAt,
    replyCount: 0,
    url: e.link,
  };
}

/** Fetches the newest posts from one subreddit. Returns posts newest-first. */
export async function searchRedditSub(
  sub: string,
  _query = "",
  limit = 100,
): Promise<{ posts: ThreadsRawPost[]; blocked: boolean }> {
  const url = `https://www.reddit.com/r/${sub}/new.rss?limit=${limit}`;
  const { ok, xml, blocked } = await fetchRss(url);
  if (!ok || !xml) return { posts: [], blocked };
  const posts = parseEntries(xml)
    .map(mapPost)
    .filter((p): p is ThreadsRawPost => p !== null)
    .sort((a, b) => (b.takenAt ?? 0) - (a.takenAt ?? 0));
  return { posts, blocked: false };
}

/**
 * Sweep: one request per subreddit, deduped, intent-filtered, unseen only.
 * Returns candidate posts ready for scoring.
 */
export async function sweepReddit(
  jitterMs = 60_000,
): Promise<{ posts: ThreadsRawPost[]; searched: number; blocked: number }> {
  const subs =
    THREADS_CONFIG.redditSubreddits.length > 0
      ? THREADS_CONFIG.redditSubreddits
      : REDDIT_SUBREDDITS;
  const results: ThreadsRawPost[] = [];
  const seen = new Set<string>();
  let searched = 0;
  let blocked = 0;
  let consecutiveBlocks = 0;

  for (const sub of subs) {
    searched++;
    const { posts, blocked: b } = await searchRedditSub(sub);
    if (b) {
      blocked++;
      consecutiveBlocks++;
      if (consecutiveBlocks >= 3) break;
      await new Promise((r) => setTimeout(r, 8_000));
      continue;
    }
    consecutiveBlocks = 0;
    for (const p of posts) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      if (!hasBuyingIntent(p.text || "")) continue;
      if (EXCLUDED_TERMS.some((t) => (p.text || "").toLowerCase().includes(t))) continue;
      if (await isSeen(p.id)) continue;
      results.push(p);
    }
    await new Promise((r) => setTimeout(r, jitterMs + Math.random() * 4_000));
  }

  results.sort((a, b) => (b.takenAt ?? 0) - (a.takenAt ?? 0));
  return { posts: results.slice(0, THREADS_CONFIG.redditMaxPerCycle), searched, blocked };
}