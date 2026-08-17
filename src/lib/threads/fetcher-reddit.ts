import { THREADS_CONFIG } from "./config";
import { hasBuyingIntent, EXCLUDED_TERMS } from "./taxonomy";
import { isSeen, markSeen } from "./store";
import type { ThreadsRawPost } from "./types";

/**
 * Reddit lead hunting: searches job-oriented subreddits for design/web work.
 * Public JSON API — no auth needed for search.
 */

const REDDIT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export const REDDIT_SUBREDDITS = [
  "forhire",
  "designjobs",
  "web_design",
  "freelance",
];

const REDDIT_QUERIES = [
  "website",
  "ui/ux",
  "ux",
  "web designer",
  "design",
  "landing page",
  "saas",
  "logo",
];

/** Prefix so Threads/Reddit post ids never collide in the shared seen set. */
export function redditPostId(id: string): string {
  return `rd:${id}`;
}

interface RedditPostJson {
  data?: {
    id?: string;
    title?: string;
    selftext?: string;
    author?: string;
    created_utc?: number;
    num_comments?: number;
    permalink?: string;
    over_18?: boolean;
    link_flair_text?: string | null;
  };
}

async function fetchJson(url: string): Promise<{ ok: boolean; data: any; blocked: boolean }> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": REDDIT_UA },
      signal: AbortSignal.timeout(THREADS_CONFIG.fetchTimeoutMs),
    });
    if (res.status === 429 || res.status === 403) return { ok: false, data: null, blocked: true };
    if (!res.ok) return { ok: false, data: null, blocked: false };
    const data = await res.json();
    return { ok: true, data, blocked: false };
  } catch {
    return { ok: false, data: null, blocked: false };
  }
}

function mapPost(raw: RedditPostJson): ThreadsRawPost | null {
  const d = raw.data;
  if (!d?.id || !d?.permalink) return null;
  if (d.over_18) return null;
  const text = `${d.title || ""} ${d.selftext || ""}`.trim().slice(0, 1000);
  if (text.length < 10) return null;
  const flair = (d.link_flair_text || "").toLowerCase();
  const id = redditPostId(d.id);
  return {
    id,
    code: undefined,
    username: d.author || "unknown",
    text,
    takenAt: d.created_utc || undefined,
    replyCount: d.num_comments ?? 0,
    url: `https://www.reddit.com${d.permalink}`,
    flair,
  };
}

/** Searches one subreddit for one query. Returns posts sorted newest-first. */
export async function searchRedditSub(
  sub: string,
  query: string,
  limit = 25,
): Promise<{ posts: ThreadsRawPost[]; blocked: boolean }> {
  const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(
    query,
  )}&restrict_sr=1&sort=new&t=week&limit=${limit}`;
  const { ok, data, blocked } = await fetchJson(url);
  if (!ok) return { posts: [], blocked };
  const children: RedditPostJson[] = data?.data?.children ?? [];
  const posts = children
    .map(mapPost)
    .filter((p): p is ThreadsRawPost => p !== null)
    .sort((a, b) => (b.takenAt ?? 0) - (a.takenAt ?? 0));
  return { posts, blocked: false };
}

/**
 * Sweep: all subreddits x all queries, deduped, intent-filtered, unseen only.
 * Returns candidate posts ready for scoring, and how many searches ran.
 */
export async function sweepReddit(
  jitterMs = 2500,
): Promise<{ posts: ThreadsRawPost[]; searched: number; blocked: number }> {
  const subs = THREADS_CONFIG.redditSubreddits.length > 0 ? THREADS_CONFIG.redditSubreddits : REDDIT_SUBREDDITS;
  const queries = REDDIT_QUERIES;
  const results: ThreadsRawPost[] = [];
  const seen = new Set<string>();
  let searched = 0;
  let blocked = 0;

  const run = async (sub: string, q: string) => {
    searched++;
    const { posts, blocked: b } = await searchRedditSub(sub, q);
    if (b) blocked++;
    for (const p of posts) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      if (!hasBuyingIntent(p.text || "")) continue;
      if (EXCLUDED_TERMS.some((t) => (p.text || "").toLowerCase().includes(t))) continue;
      if (await isSeen(p.id)) continue;
      results.push(p);
    }
    await new Promise((r) => setTimeout(r, jitterMs + Math.random() * jitterMs));
  };

  const tasks: Promise<void>[] = [];
  let idx = 0;
  const workerCount = Math.min(2, subs.length * queries.length);
  const workers = Array.from({ length: Math.max(1, workerCount) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= subs.length * queries.length) return;
      const sub = subs[Math.floor(i / queries.length)];
      const q = queries[i % queries.length];
      await run(sub, q);
    }
  });
  await Promise.all(workers);

  results.sort((a, b) => (b.takenAt ?? 0) - (a.takenAt ?? 0));
  return { posts: results.slice(0, THREADS_CONFIG.redditMaxPerCycle), searched, blocked };
}

/** Marks reddit posts seen (called by monitor after scoring attempt). */
export async function markRedditSeen(postIds: string[]): Promise<void> {
  await markSeen(postIds);
}
