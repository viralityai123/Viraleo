import { THREADS_CONFIG } from "./config";
import type { ThreadsRawPost, ThreadsSource } from "./types";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";

/**
 * Fetcher engine, newest-first:
 *
 * 1. Session SSR (primary): GET https://www.threads.com/search?q=<kw> as the
 *    logged-in user's mobile session; the server-rendered page embeds the
 *    searchResults GraphQL response (verified working, no doc_id needed).
 * 2. Anonymous SSR (fallback): same URL, no cookies (currently 429-walled
 *    from datacenter IPs; kept for proxies/local).
 * 3. Apify (emergency fallback): automation-lab~threads-scraper when
 *    APIFY_TOKEN is set and SSR is blocked/empty.
 *
 * NOTE: the persisted-query GraphQL endpoint (doc_id 28300107386286707 for
 * BarcelonaSearchResultsQuery) rejects every variables payload with
 * `invalid_variable_type` — the operation appears to require client-side
 * comet context (__csr/__dyn bitmaps) that can't be reproduced server-side,
 * so search is done via SSR only. Other docs (viewer data etc.) do work.
 */

const X_IG_APP_ID = "238260118697367";

const BROWSER_UAS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

const BASE_HEADERS: Record<string, string> = {
  "x-ig-app-id": X_IG_APP_ID,
  "user-agent": MOBILE_UA,
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9",
};

function extractText(node: any): string | undefined {
  const candidates = [
    node?.caption?.text,
    node?.text_post_app_info?.shareable_content?.share_text,
    node?.text_post_app_info?.shareable_content?.reply_facepile?.text,
    typeof node?.text === "string" ? node?.text : undefined,
  ];
  const found = candidates.find((c) => typeof c === "string" && c.trim().length > 0);
  return typeof found === "string" ? found.trim() : undefined;
}

function looksLikePost(node: any): boolean {
  if (!node || typeof node !== "object") return false;
  const id = node.id;
  if (typeof id !== "string" || !/^\d+$/.test(id)) return false;
  return (
    typeof node.code === "string" ||
    typeof node.url_path === "string" ||
    typeof node.caption === "object" ||
    typeof node.text_post_app_info === "object"
  );
}

function toPost(node: any): ThreadsRawPost | null {
  const text = extractText(node);
  if (!text) return null;
  const username: string | undefined = node?.user?.username || node?.username;
  const code: string | undefined = node?.code;
  const post: ThreadsRawPost = {
    id: String(node.id),
    code,
    urlPath: node?.url_path,
    username,
    text,
    takenAt: node?.taken_at ? Number(node.taken_at) : undefined,
    likeCount: node?.like_count,
    replyCount: node?.reply_count,
  };
  return post;
}

function walkForPosts(root: any, depth = 0): ThreadsRawPost[] {
  if (depth > 14 || root === null || typeof root !== "object") return [];
  const out: ThreadsRawPost[] = [];
  if (Array.isArray(root)) {
    for (const item of root) {
      out.push(...walkForPosts(item, depth + 1));
    }
    return out;
  }
  if (looksLikePost(root)) {
    const post = toPost(root);
    if (post) out.push(post);
  }
  for (const value of Object.values(root)) {
    if (value && typeof value === "object") {
      out.push(...walkForPosts(value, depth + 1));
    }
  }
  return out;
}

function dedupe(posts: ThreadsRawPost[]): ThreadsRawPost[] {
  const seen = new Set<string>();
  const out: ThreadsRawPost[] = [];
  for (const post of posts) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    out.push(post);
  }
  out.sort((a, b) => (b.takenAt ?? 0) - (a.takenAt ?? 0));
  return out;
}

function postUrl(post: ThreadsRawPost): string {
  if (post.username)
    return `https://www.threads.com/@${post.username}/post/${post.code || post.id}`;
  if (post.code) return `https://www.threads.com/t/${post.code}`;
  return `https://www.threads.com/threads/${post.id}`;
}

/* ------------------------------------------------------------------ */
/* SSR engine                                                          */
/* ------------------------------------------------------------------ */

function balancedSlice(text: string, start: number): string | null {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/** Minimal HTTPS proxy support via a CONNECT tunnel (no deps needed). */
function proxyFetch(
  proxyUrl: string,
  url: string,
  init: { headers?: Record<string, string>; timeoutMs: number },
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    let u: URL;
    let proxy: URL;
    try {
      u = new URL(url);
      proxy = new URL(proxyUrl);
    } catch (e) {
      reject(e);
      return;
    }
    const proxyPort = Number(proxy.port || (proxy.protocol === "https:" ? 443 : 80));
    const auth =
      proxy.username || proxy.password
        ? "Basic " +
          Buffer.from(
            `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`,
          ).toString("base64")
        : null;
    const socket = net.connect(proxyPort, proxy.hostname, () => {
      let req = `CONNECT ${u.hostname}:${u.port || 443} HTTP/1.1\r\nHost: ${u.hostname}:${u.port || 443}\r\n`;
      if (auth) req += `Proxy-Authorization: ${auth}\r\n`;
      req += "\r\n";
      socket.write(req);
    });
    const timeout = setTimeout(() => {
      socket.destroy(new Error("Proxy connect timeout"));
    }, 15_000);

    let connected = false;
    socket.on("data", (chunk) => {
      if (connected) return;
      const head = chunk.toString("latin1");
      const match = head.match(/^HTTP\/1\.[01] (\d+)/);
      if (!match) return;
      const status = Number(match[1]);
      if (status !== 200) {
        clearTimeout(timeout);
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed: ${status}`));
        return;
      }
      connected = true;
      const tlsSocket = tls.connect({ socket, servername: u.hostname }, () => {
        clearTimeout(timeout);
        const req2 = https.request({
          method: "GET",
          createConnection: () => tlsSocket,
          host: u.hostname,
          path: u.pathname + u.search,
          headers: {
            ...(init.headers || {}),
            host: u.hostname,
          },
          timeout: init.timeoutMs,
        });
        req2.on("response", (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (d) => (body += d));
          res.on("end", () => resolve({ status: res.statusCode ?? 0, text: body }));
        });
        req2.on("error", reject);
        req2.end();
      });
      tlsSocket.on("error", (e) => reject(e));
    });
    socket.on("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
  });
}

/**
 * Parses the SSR search page. Returns `null` when the page contained no
 * search payload at all (block/challenge page or shape change), otherwise
 * the extracted posts (possibly an empty array for a legitimately empty
 * result set).
 *
 * The page contains multiple `{"__bbox":{"complete":true` JSON blocks (one
 * per server-rendered GraphQL query). Only the one with `searchResults`
 * carries the results, so each block is scanned in turn.
 */
function parseSearchResults(html: string): ThreadsRawPost[] | null {
  const needle = '{"__bbox":{"complete":true';
  let from = 0;
  let foundSearchResults = false;
  while (true) {
    const start = html.indexOf(needle, from);
    if (start === -1) break;
    from = start + 1;
    const obj = balancedSlice(html, start);
    if (!obj) continue;
    let parsed: any;
    try {
      parsed = JSON.parse(obj);
    } catch {
      continue;
    }
    const sr = parsed?.__bbox?.result?.data?.searchResults;
    if (!sr || typeof sr !== "object") continue;
    foundSearchResults = true;
    const edges = sr.edges;
    if (!Array.isArray(edges)) continue;
    const posts: ThreadsRawPost[] = [];
    for (const edge of edges) {
      const thread = edge?.node?.thread;
      const items = thread?.thread_items;
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const node = item?.post;
        if (!node) continue;
        const text = extractText(node);
        if (!text) continue;
        posts.push({
          id: String(node.pk ?? node.id ?? Math.random().toString(36).slice(2)),
          code: node.code,
          username: node?.user?.username,
          text,
          takenAt: node.taken_at ? Number(node.taken_at) : undefined,
          likeCount: node.like_count,
          replyCount: node?.text_post_app_info?.direct_reply_count,
        });
      }
    }
    return posts;
  }
  return foundSearchResults ? [] : null;
}

export async function searchSsr(keyword: string): Promise<ThreadsRawPost[]> {
  const proxyUrl = process.env.THREADS_PROXY_URL;
  const uas = BROWSER_UAS.map((ua, i) =>
    i === 0 ? ua : ua.replace(/Chrome\/[\d.]+/, "Chrome/1" + (25 + i) + ".0.0.0"),
  );
  const attempts: Array<{ url: string; headers: Record<string, string> }> = [];
  for (const host of ["https://www.threads.com", "https://www.threads.net"]) {
    for (const ua of [uas[0], uas[1], MOBILE_UA]) {
      attempts.push({
        url: `${host}/search?q=${encodeURIComponent(keyword)}`,
        headers: {
          "user-agent": ua,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
        },
      });
    }
  }

  let lastErr: Error | null = null;
  for (const attempt of attempts) {
    try {
      const res = proxyUrl
        ? await proxyFetch(proxyUrl, attempt.url, {
            headers: attempt.headers,
            timeoutMs: THREADS_CONFIG.fetchTimeoutMs,
          })
        : await fetch(attempt.url, {
            headers: attempt.headers,
            redirect: "follow",
            signal: AbortSignal.timeout(THREADS_CONFIG.fetchTimeoutMs),
          });
      let html: string;
      if (proxyUrl) {
        const r = res as { status: number; text: string };
        if (r.status === 429 || r.status === 403 || r.status === 401) {
          throw new Error(`Blocked (${r.status})`);
        }
        if (r.status >= 400) continue;
        html = r.text;
      } else {
        const r = res as Response;
        if (r.status === 429 || r.status === 403 || r.status === 401) {
          throw new Error(`Blocked (${r.status})`);
        }
        if (r.status >= 400) continue;
        html = await r.text();
      }
      const parsed = parseSearchResults(html);
      if (parsed === null) {
        lastErr = new Error("Search page had no payload (challenge/block page?)");
        continue;
      }
      const posts = dedupe(parsed).slice(0, THREADS_CONFIG.maxResultsPerKeyword);
      if (posts.length > 0) return posts;
      return [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastErr = new Error(msg);
      if (msg.includes("Blocked")) throw lastErr;
    }
  }
  if (lastErr) throw lastErr;
  return [];
}

/* ------------------------------------------------------------------ */
/* DIY GraphQL probe (kept as free probe; mostly blocked from DC IPs)  */
/* ------------------------------------------------------------------ */

const GRAPHQL_ENDPOINT = "https://www.threads.net/api/graphql";

export async function searchDiy(keyword: string): Promise<ThreadsRawPost[]> {
  const attempts: unknown[] = [
    {
      query_name: "threads_timeline_search_results_feed_query",
      variables: { query: keyword, count: THREADS_CONFIG.maxResultsPerKeyword },
    },
    {
      query_name: "threads_timeline_search_results_feed_query",
      variables: JSON.stringify({
        query: keyword,
        count: THREADS_CONFIG.maxResultsPerKeyword,
      }),
    },
  ];

  for (const body of attempts) {
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { ...BASE_HEADERS, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(THREADS_CONFIG.fetchTimeoutMs),
      });
      if (!res.ok) {
        if (res.status === 429 || res.status === 403 || res.status === 401) {
          throw new Error(`Blocked (${res.status})`);
        }
        continue;
      }
      const json: any = await res.json();
      if (!json || json.status === "fail") continue;
      const root = json.data ?? json;
      const posts = dedupe(walkForPosts(root));
      if (posts.length > 0 || json.data) return posts;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Blocked") || msg.includes("Timeout") || msg.includes("aborted")) throw e;
    }
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Session-based search (needs a logged-in threads session)            */
/* ------------------------------------------------------------------ */

function hasThreadsSession(): boolean {
  return Boolean(process.env.THREADS_SESSION_ID);
}

function randomIgDid(): string {
  return (
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) + "-" + Math.floor(Math.random() * 1e6).toString(36)
  );
}

function sessionCookieHeader(): string {
  if (process.env.THREADS_COOKIES) return process.env.THREADS_COOKIES;
  const parts = [`sessionid=${process.env.THREADS_SESSION_ID || ""}`];
  if (process.env.THREADS_CSRF_TOKEN) parts.push(`csrftoken=${process.env.THREADS_CSRF_TOKEN}`);
  if (process.env.THREADS_USER_ID) parts.push(`ds_user_id=${process.env.THREADS_USER_ID}`);
  parts.push(`ig_did=${randomIgDid()}`, "dpr=2");
  return parts.join("; ");
}

/**
 * Server-rendered search page rendered for a logged-in mobile session.
 * The SSR payload embeds the searchResults GraphQL response (same
 * `{"__bbox":{"complete":true` shape parseSearchResults already reads), so
 * results come back without any GraphQL call, doc_id, or comet tokens.
 *
 * Returns null when no session is configured or the page had no search
 * payload (block/challenge/redirect), so the caller can fall back to the
 * anonymous SSR search.
 */
export async function searchThreadsLatest(keyword: string): Promise<ThreadsRawPost[] | null> {
  if (!hasThreadsSession()) return null;
  const cookie = sessionCookieHeader();
  const searchUrl = `https://www.threads.com/search?q=${encodeURIComponent(keyword)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        cookie,
        "user-agent": MOBILE_UA,
        "accept-language": "en-GB,en;q=0.9",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        referer: "https://www.threads.com/",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(THREADS_CONFIG.fetchTimeoutMs),
    });
    if (res.status === 429 || res.status === 403 || res.status === 401) {
      console.log(`[threads-session] "${keyword}" html blocked (${res.status})`);
      return null;
    }
    if (!res.ok) {
      console.log(
        `[threads-session] "${keyword}" html status ${res.status}${res.redirected ? ` -> ${res.url}` : ""}`,
      );
      return null;
    }
    const html = await res.text();
    const parsed = parseSearchResults(html);
    if (parsed === null) {
      console.log(`[threads-session] "${keyword}" html had no search payload (${html.length}b)`);
      return null;
    }
    const posts = dedupe(parsed).slice(0, THREADS_CONFIG.maxResultsPerKeyword);
    console.log(
      `[threads-session] "${keyword}" html ${res.status} (${html.length}b) -> ${posts.length} posts`,
    );
    return posts;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Blocked") || msg.includes("Timeout") || msg.includes("aborted")) return null;
    console.log(`[threads-session] "${keyword}" html fetch failed: ${msg}`);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Apify (emergency fallback)                                          */
/* ------------------------------------------------------------------ */

function apifyItemToPost(item: any): ThreadsRawPost | null {
  const text: string | undefined = item?.text || item?.caption?.text;
  if (!text) return null;
  const username: string | undefined = item?.username || item?.ownerUsername;
  const url: string | undefined = item?.postUrl || item?.url;
  const id: string = String(
    item?.id || item?.postId || item?.url || Math.random().toString(36).slice(2),
  );
  return {
    id,
    username,
    text: text.trim(),
    takenAt: item?.timestamp ? new Date(item.timestamp).getTime() / 1000 : undefined,
    likeCount: item?.likes ?? item?.likeCount,
    replyCount: item?.replies ?? item?.replyCount,
    code: item?.code,
  };
}

export async function searchApify(keyword: string): Promise<ThreadsRawPost[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];
  const url = `https://api.apify.com/v2/acts/automation-lab~threads-scraper/run-sync-get-dataset-items?token=${token}&timeout=90`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "search",
        searchQueries: [keyword],
        maxPosts: THREADS_CONFIG.maxResultsPerKeyword,
        includeProfile: false,
      }),
      signal: AbortSignal.timeout(95_000),
    });
    if (!res.ok) return [];
    const items: any[] = await res.json();
    const posts = items.map(apifyItemToPost).filter((p): p is ThreadsRawPost => p !== null);
    return dedupe(posts);
  } catch {
    return [];
  }
}

/**
 * Search Threads for a keyword.
 * Order: SSR (free, primary) -> Apify (fallback) -> DIY (probe).
 * THREADS_FETCHER=ssr|diy|apify forces one engine; auto = ssr first, then
 * Apify if token set, then DIY. THREADS_PROXY_URL routes SSR through a proxy
 * when set (handy if Meta starts blocking the datacenter IP).
 */
export async function searchKeyword(
  keyword: string,
  consecutiveFailures: number,
  sourceOverride?: ThreadsSource,
): Promise<{ posts: ThreadsRawPost[]; source: ThreadsSource }> {
  const mode = process.env.THREADS_FETCHER || "auto";
  const hasApify = !!process.env.APIFY_TOKEN;
  const ssrAllowed =
    mode !== "apify" && mode !== "diy" && sourceOverride !== "apify" && sourceOverride !== "diy";
  const diyAllowed = mode === "diy" || sourceOverride === "diy";
  const apifyAllowed =
    hasApify && (mode === "apify" || mode === "auto" || sourceOverride === "apify");

  if (mode === "apify") {
    const posts = await searchApify(keyword);
    return { posts, source: "apify" };
  }

  if (ssrAllowed) {
    try {
      const latest = hasThreadsSession() ? await searchThreadsLatest(keyword) : null;
      if (latest && latest.length > 0) return { posts: latest, source: "ssr" };
      const posts = await searchSsr(keyword);
      if (posts.length > 0) return { posts, source: "ssr" };
      return { posts: [], source: "ssr" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (apifyAllowed) {
        const posts = await searchApify(keyword);
        if (posts.length > 0) return { posts, source: "apify" };
      }
      throw new Error(`Threads SSR search failed for "${keyword}": ${msg}`);
    }
  }

  if (apifyAllowed) {
    const posts = await searchApify(keyword);
    if (posts.length > 0) return { posts, source: "apify" };
  }

  if (diyAllowed) {
    const posts = await searchDiy(keyword);
    return { posts, source: "diy" };
  }

  if (ssrAllowed) {
    throw new Error(`Threads SSR search returned no posts for "${keyword}"`);
  }
  return { posts: [], source: "diy" };
}

export function buildPostUrl(post: ThreadsRawPost): string {
  return postUrl(post);
}
