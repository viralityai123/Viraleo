import { getSession, setSession } from "./session";
import type { ThreadsSession } from "./session";
import type { ReplyResult } from "./publisher";

/**
 * Web-session publishing: uses the account's browser cookie session against
 * the Threads web GraphQL composer endpoint — no OAuth / Meta app required.
 * Requires lsd + fb_dtsg (+ composer doc_id) captured during a logged-in run.
 */

const GRAPHQL_ENDPOINT = "https://www.threads.com/graphql/query";
const HOME = "https://www.threads.com/";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const IG_APP_ID = "238260118697367";

export function extractTokensFromHtml(html: string): Partial<ThreadsSession> {
  const grab = (re: RegExp): string => {
    const m = html.match(re);
    return m?.[1] ?? "";
  };
  return {
    lsd:
      grab(/\["LSD",\[\],\{"token":"([^"]+)"\}/) ||
      grab(/"LSD",\s*\["token",[^\]]*?"([^"]+)"/) ||
      grab(/"LSD":\{"token":"([^"]+)"/),
    fbDtsg:
      grab(/\["DTSGInitialData",\[\],\{"token":"([^"]+)"\}/) ||
      grab(/"DTSGInitialData":\{"token":"([^"]+)"/),
    jazoest: grab(/jazoest=(\d+)/) || grab(/"jazoest":"(\d+)"/),
    spinR: grab(/"spin_r":(\d+)/) || grab(/"__spin_r":(\d+)/),
    spinB: grab(/"spin_b":"([^"]+)"/) || grab(/"__spin_b":"([^"]+)"/),
    spinT: grab(/"spin_t":(\d+)/) || grab(/"__spin_t":(\d+)/),
    rev: grab(/"rev":(\d+)/) || grab(/"__rev":(\d+)/),
    hs: grab(/"haste_session":"([^"]+)"/) || grab(/"__hs":"([^"]+)"/),
  };
}

async function fetchHomeTokens(session: ThreadsSession): Promise<Partial<ThreadsSession> | null> {
  try {
    const res = await fetch(HOME, {
      headers: {
        "user-agent": UA,
        cookie: session.cookies,
        "accept-language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const tokens = extractTokensFromHtml(html);
    if (!tokens.lsd || !tokens.fbDtsg) return null;
    return tokens;
  } catch {
    return null;
  }
}

async function ensureWebTokens(): Promise<ThreadsSession | null> {
  const s = await getSession();
  if (!s || !s.cookies) return null;
  if (s.lsd && s.fbDtsg) return s;
  const fresh = await fetchHomeTokens(s);
  if (fresh) {
    const merged: ThreadsSession = { ...s, ...fresh, ts: Date.now() };
    await setSession(merged);
    return merged;
  }
  return s;
}

let cachedDocId: string | null | undefined;

async function scanBundleForDocId(session: ThreadsSession): Promise<string> {
  try {
    const res = await fetch(HOME, {
      headers: { "user-agent": UA, cookie: session.cookies },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const scriptUrls = Array.from(html.matchAll(/<script[^>]+src="([^"]+\.js)[^"]*"/g))
      .map((m) => m[1])
      .filter((u) => u.includes("static.cdninstagram.com") || u.includes(".js"));
    const seen = new Set<string>();
    for (const url of scriptUrls) {
      if (seen.has(url) || !url.startsWith("https://")) continue;
      seen.add(url);
      try {
        const r = await fetch(url, {
          headers: { "user-agent": UA },
          signal: AbortSignal.timeout(30_000),
        });
        if (!r.ok) continue;
        const text = await r.text();
        if (!text.includes("postCreationParam")) continue;
        const patterns = [
          /postCreationParam.{0,3000}?["']doc_id["']\s*[:=]?\s*["']?(\d{8,})["']?/s,
          /ThreadsCreatePostMutation.{0,3000}?["']?id["']?\s*[:=]\s*["'](\d{8,})["']/s,
        ];
        for (const p of patterns) {
          const m = text.match(p);
          if (m) return m[1];
        }
      } catch {
        // next script
      }
    }
  } catch {
    // fall through
  }
  return "";
}

async function getComposerDocId(): Promise<string> {
  if (cachedDocId !== undefined) return cachedDocId;
  const s = await getSession();
  if (s?.docId) {
    cachedDocId = s.docId;
    return s.docId;
  }
  const scanned = s ? await scanBundleForDocId(s) : "";
  if (scanned && s) {
    await setSession({ ...s, docId: scanned });
  }
  cachedDocId = scanned || "";
  return scanned;
}

function buildForm(session: ThreadsSession, docId: string, variables: string): URLSearchParams {
  const uid = session.userId;
  const form = new URLSearchParams();
  if (uid) form.set("av", uid);
  if (uid) form.set("__user", uid);
  form.set("__a", "1");
  form.set("__req", "3");
  form.set("__hs", session.hs || "19551.HYP:threads_web_pkg.2.1.0.0.1");
  form.set("dpr", "1");
  form.set("__ccg", "GOOD");
  if (session.rev) form.set("__rev", session.rev);
  form.set("__comet_req", "7");
  if (session.fbDtsg) form.set("fb_dtsg", session.fbDtsg);
  if (session.jazoest) form.set("jazoest", session.jazoest);
  if (session.lsd) form.set("lsd", session.lsd);
  if (session.spinR) form.set("__spin_r", session.spinR);
  if (session.spinB) form.set("__spin_b", session.spinB);
  if (session.spinT) form.set("__spin_t", session.spinT);
  form.set("fb_api_caller_class", "RelayModern");
  form.set("fb_api_req_friendly_name", "BarcelonaComposerPostButton_replyPost");
  form.set("variables", variables);
  form.set("server_timestamps", "true");
  form.set("doc_id", docId);
  return form;
}

function baseHeaders(session: ThreadsSession): Record<string, string> {
  return {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/x-www-form-urlencoded",
    origin: "https://www.threads.net",
    referer: "https://www.threads.net/",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-asbd-id": "129477",
    "x-fb-lsd": session.lsd || "",
    "x-ig-app-id": IG_APP_ID,
    "user-agent": UA,
    cookie: session.cookies,
  };
}

function composerSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function variableCandidates(postId: string, text: string): string[] {
  const cid = composerSessionId();
  const base = {
    postCreationParam: {
      content: { text, entities: [], media: [], mentions: [] },
      composer_session_id: cid,
      with_recommended_user_status: true,
      location: "composer",
    },
    uploadID: null,
  };
  return [
    JSON.stringify({ ...base, postCreationParam: { ...base.postCreationParam, reply_to: postId } }),
    JSON.stringify({ ...base, postCreationParam: { ...base.postCreationParam, reply_to_post_id: postId } }),
    JSON.stringify({ ...base, postCreationParam: { ...base.postCreationParam, content: { text, entities: [], media: [], mentions: [], reply_to: postId } } }),
    JSON.stringify(base),
  ];
}

/**
 * Publishes a reply using the web session (cookies + lsd + fb_dtsg + doc_id).
 */
export async function publishReplyWeb(postId: string, text: string): Promise<ReplyResult> {
  const session = await ensureWebTokens();
  if (!session?.cookies) return { ok: false, error: "NO_SESSION" };
  if (!session.lsd || !session.fbDtsg) return { ok: false, error: "NO_WEB_TOKENS" };

  let docId = await getComposerDocId();
  if (!docId) return { ok: false, error: "NO_DOC_ID" };

  const variablesList = variableCandidates(postId, text);
  const headers = baseHeaders(session);

  for (const variables of variablesList) {
    const form = buildForm(session, docId, variables);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers,
        body: form.toString(),
        signal: AbortSignal.timeout(25_000),
      });
      if (res.status === 429 || res.status === 403 || res.status === 401) {
        return { ok: false, error: `WEB_BLOCKED (${res.status})` };
      }
      const json: any = await res.json().catch(() => ({}));
      if (json?.status === "ok" && json?.data?.post_creation) {
        const mediaId = String(
          json.data.post_creation.media_id || json.data.post_creation.id || "",
        );
        return { ok: true, replyId: mediaId };
      }
      const failText =
        json?.error_description ||
        json?.message ||
        json?.status_fail_reason ||
        json?.error?.message ||
        JSON.stringify(json).slice(0, 300);
      if (!/Invalid (doc|variables|mutation)/i.test(String(failText))) {
        // wrong shape — try next candidate
        console.log("[webPublish] candidate rejected:", String(failText).slice(0, 200));
      } else {
        return { ok: false, error: `WEB_GRAPHQL: ${failText}` };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("aborted") || msg.includes("Timeout")) {
        return { ok: false, error: "WEB_TIMEOUT" };
      }
    }
  }
  return { ok: false, error: "WEB_GRAPHQL: all variable shapes failed" };
}

export async function webPublishStatus(): Promise<{
  hasSession: boolean;
  hasTokens: boolean;
  docId: string;
  sessionAgeDays: number;
}> {
  const s = await getSession();
  if (!s) return { hasSession: false, hasTokens: false, docId: "", sessionAgeDays: 0 };
  const docId = s.docId || (await getComposerDocId());
  return {
    hasSession: Boolean(s.sessionId),
    hasTokens: Boolean(s.lsd && s.fbDtsg),
    docId,
    sessionAgeDays: (Date.now() - (s.ts || 0)) / 86_400_000,
  };
}
