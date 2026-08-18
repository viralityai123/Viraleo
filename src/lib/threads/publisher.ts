import { getAuth, setAuth, clearAuth } from "./store";
import { publishReplyWeb } from "./webPublish";

/**
 * Official Threads Graph API (graph.threads.net) — publishing + token handling.
 * Replies are exempt from the 250-post/day limit (capped at 1,000 replies/24h).
 */

const GRAPH_HOST = "https://graph.threads.net";

export async function getAccessToken(): Promise<string | null> {
  const auth = await getAuth();
  if (!auth?.accessToken) return null;
  if (Date.now() < auth.expiresAt - 7 * 24 * 60 * 60 * 1000) return auth.accessToken;
  const refreshed = await refreshAccessToken(auth.accessToken);
  return refreshed;
}

export async function refreshAccessToken(currentToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${GRAPH_HOST}/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(currentToken)}`,
      { signal: AbortSignal.timeout(20_000) },
    );
    if (!res.ok) return null;
    const json: any = await res.json();
    const token: string | undefined = json?.access_token;
    const expiresIn = Number(json?.expires_in) || 60 * 24 * 60 * 60;
    if (!token) return null;
    const auth = await getAuth();
    await setAuth({
      accessToken: token,
      userId: auth?.userId || "",
      expiresAt: Date.now() + expiresIn * 1000,
      username: auth?.username,
    });
    console.log("[threads] long-lived token refreshed");
    return token;
  } catch {
    return null;
  }
}

export async function getPublishingLimit(): Promise<number> {
  const token = await getAccessToken();
  const auth = await getAuth();
  if (!token || !auth?.userId) return 0;
  try {
    const res = await fetch(
      `${GRAPH_HOST}/v1.0/${auth.userId}/threads_publishing_limit?fields=quota_usage,config&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return 0;
    const json: any = await res.json();
    return Number(json?.data?.[0]?.quota_usage) || 0;
  } catch {
    return 0;
  }
}

export interface ReplyResult {
  ok: boolean;
  replyId?: string;
  error?: string;
  errorCode?: number;
}

/**
 * Creates + publishes a reply on the given thread.
 * Note: Meta may restrict reply_to_id to threads you own — verify on a
 * stranger's post during testing; if blocked, the queue UI offers a
 * deep link to reply manually instead.
 */
export async function publishReply(postId: string, text: string): Promise<ReplyResult> {
  const token = await getAccessToken();
  if (!token) {
    const web = await publishReplyWeb(postId, text);
    if (web.ok || web.error === "NO_SESSION" || web.error === "NO_WEB_TOKENS" || web.error === "NO_DOC_ID") {
      return web;
    }
    return { ok: false, error: `NOT_CONNECTED; web: ${web.error}` };
  }
  const official = await publishReplyOfficial(postId, text, token);
  if (official.ok) return official;
  const web = await publishReplyWeb(postId, text);
  if (web.ok) return web;
  return {
    ok: false,
    error: `${official.error || "official failed"}; web: ${web.error}`,
    errorCode: official.errorCode,
  };
}

async function publishReplyOfficial(postId: string, text: string, token: string): Promise<ReplyResult> {
  const auth = await getAuth();
  if (!auth?.userId) {
    return { ok: false, error: "NOT_CONNECTED" };
  }
  try {
    const containerRes = await fetch(`${GRAPH_HOST}/v1.0/${auth.userId}/threads`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        media_type: "TEXT",
        text,
        reply_to_id: postId,
        access_token: token,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const containerJson: any = await containerRes.json().catch(() => ({}));
    if (!containerRes.ok) {
      const code = Number(containerJson?.error?.code);
      if (code === 190 || code === 200) {
        await clearAuth();
        return { ok: false, error: "TOKEN_INVALID", errorCode: code };
      }
      return {
        ok: false,
        error: containerJson?.error?.message || `Container failed (${containerRes.status})`,
        errorCode: code,
      };
    }
    const creationId = containerJson?.id;
    if (!creationId) return { ok: false, error: "No creation id returned" };

    const publishRes = await fetch(`${GRAPH_HOST}/v1.0/${auth.userId}/threads_publish`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ creation_id: creationId, access_token: token }),
      signal: AbortSignal.timeout(20_000),
    });
    const publishJson: any = await publishRes.json().catch(() => ({}));
    if (!publishRes.ok) {
      return {
        ok: false,
        error: publishJson?.error?.message || `Publish failed (${publishRes.status})`,
        errorCode: Number(publishJson?.error?.code),
      };
    }
    return { ok: true, replyId: String(publishJson?.id || "") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
