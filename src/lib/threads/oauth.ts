import { setAuth } from "./store";
import type { ThreadsAuth } from "./types";

const GRAPH_HOST = "https://graph.threads.net";
const AUTHORIZE_HOST = "https://www.threads.net/oauth/authorize";

export function getThreadsAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || "",
    redirect_uri: redirectUri,
    scope: "threads_basic,threads_content_publish",
    response_type: "code",
    state: "threads",
  });
  return `${AUTHORIZE_HOST}?${params.toString()}`;
}

export function isOAuthConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

/**
 * Exchanges the OAuth code for a short-lived token, then upgrades it to a
 * long-lived token (60 days, refreshable) and stores it in KV.
 */
export async function exchangeThreadsCode(
  code: string,
  redirectUri: string,
): Promise<{ ok: true; username?: string } | { ok: false; error: string }> {
  const clientId = process.env.META_APP_ID || "";
  const clientSecret = process.env.META_APP_SECRET || "";
  if (!clientId || !clientSecret)
    return { ok: false, error: "META_APP_ID / META_APP_SECRET not set" };

  try {
    const tokenRes = await fetch(`${GRAPH_HOST}/oauth/access_token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const tokenJson: any = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok) {
      return {
        ok: false,
        error: tokenJson?.error?.message || `Token exchange failed (${tokenRes.status})`,
      };
    }
    const shortToken: string = tokenJson?.access_token;
    const userId: string = String(tokenJson?.user_id || "");
    if (!shortToken || !userId) return { ok: false, error: "No token/user returned" };

    const longRes = await fetch(
      `${GRAPH_HOST}/access_token?grant_type=th_exchange_token&client_secret=${encodeURIComponent(clientSecret)}&access_token=${encodeURIComponent(shortToken)}`,
      { signal: AbortSignal.timeout(20_000) },
    );
    const longJson: any = await longRes.json().catch(() => ({}));
    const longToken: string = longJson?.access_token || shortToken;
    const expiresIn = Number(longJson?.expires_in) || 60 * 24 * 60 * 60;

    const auth: ThreadsAuth = {
      accessToken: longToken,
      userId,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    await setAuth(auth);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
