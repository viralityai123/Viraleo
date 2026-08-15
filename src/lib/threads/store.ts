import { getKv } from "@/lib/kv";
import type { ThreadsAuth, ThreadsLead, ThreadsMonitorState } from "./types";

const QUEUE_KEY = "threads:queue";
const SEEN_KEY = "threads:seen";
const TRACKER_KEY = "threads:tracker";
const AUTH_KEY = "threads:auth";
const STATE_KEY = "threads:monitor";
const AUTOAPPROVE_KEY = "threads:autoapprove";

export function isKvReady(): boolean {
  return getKv() !== null;
}

export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function trackerRow(lead: ThreadsLead, replyId: string, status: string): string {
  return [
    new Date().toISOString().slice(0, 10),
    csvEscape(lead.username),
    csvEscape(lead.postUrl),
    csvEscape(lead.category),
    lead.intentScore,
    csvEscape(lead.matchedKeyword),
    lead.source,
    csvEscape(replyId),
    csvEscape(status),
    csvEscape(lead.replyDrafts[0] || ""),
  ].join(",");
}

function repliesKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `threads:replies:${today}`;
}

async function listAll(key: string): Promise<string[]> {
  const kv = getKv();
  if (!kv) return [];
  try {
    return await kv.lrange(key, 0, -1);
  } catch {
    return [];
  }
}

// --- seen / dedupe ---

export async function isSeen(postUrl: string): Promise<boolean> {
  const kv = getKv();
  if (!kv) return true;
  try {
    return Boolean(await kv.sismember(SEEN_KEY, postUrl));
  } catch {
    return true;
  }
}

export async function markSeen(postUrls: string[]): Promise<void> {
  const kv = getKv();
  if (!kv || postUrls.length === 0) return;
  try {
    await kv.sadd(SEEN_KEY, ...postUrls);
  } catch {
    // non-fatal
  }
}

// --- queue ---

export async function pushLead(lead: ThreadsLead): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  try {
    await kv.rpush(QUEUE_KEY, JSON.stringify(lead));
  } catch (e) {
    console.error("[threads] pushLead failed:", e);
  }
}

export async function listQueue(): Promise<ThreadsLead[]> {
  const items = await listAll(QUEUE_KEY);
  return items
    .map((raw) => {
      try {
        return JSON.parse(raw) as ThreadsLead;
      } catch {
        return null;
      }
    })
    .filter((l): l is ThreadsLead => l !== null);
}

export async function removeFromQueue(lead: ThreadsLead): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  try {
    await kv.lrem(QUEUE_KEY, 1, JSON.stringify(lead));
  } catch {
    // fallback: rebuild list without the postId
    try {
      const rest = (await listQueue()).filter((l) => l.postId !== lead.postId);
      await kv.del(QUEUE_KEY);
      if (rest.length > 0) await kv.rpush(QUEUE_KEY, ...rest.map((l) => JSON.stringify(l)));
    } catch {
      // non-fatal
    }
  }
}

export async function countQueue(): Promise<number> {
  const kv = getKv();
  if (!kv) return 0;
  try {
    return await kv.llen(QUEUE_KEY);
  } catch {
    return 0;
  }
}

// --- tracker (CSV rows, one line per replied lead) ---

export async function appendTrackerRow(row: string): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  try {
    await kv.rpush(TRACKER_KEY, row);
  } catch (e) {
    console.error("[threads] appendTrackerRow failed:", e);
  }
}

export async function listTrackerRows(): Promise<string[]> {
  return listAll(TRACKER_KEY);
}

// --- daily reply counter ---

export async function getRepliesToday(): Promise<number> {
  const kv = getKv();
  if (!kv) return 0;
  try {
    return (await kv.get<number>(repliesKey())) || 0;
  } catch {
    return 0;
  }
}

export async function incrementReplies(): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  try {
    await kv.incr(repliesKey());
    await kv.expire(repliesKey(), 2 * 24 * 60 * 60);
  } catch {
    // non-fatal
  }
}

// --- auth ---

export async function getAuth(): Promise<ThreadsAuth | null> {
  const kv = getKv();
  if (!kv) return null;
  try {
    const raw = await kv.hgetall(AUTH_KEY);
    if (!raw?.accessToken || !raw?.userId) return null;
    return {
      accessToken: raw.accessToken as string,
      userId: raw.userId as string,
      expiresAt: Number(raw.expiresAt || 0),
      username: (raw.username as string) || undefined,
    };
  } catch {
    return null;
  }
}

export async function setAuth(auth: ThreadsAuth): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  try {
    await kv.hset(AUTH_KEY, {
      accessToken: auth.accessToken,
      userId: auth.userId,
      expiresAt: String(auth.expiresAt),
      username: auth.username || "",
    });
  } catch (e) {
    console.error("[threads] setAuth failed:", e);
  }
}

export async function clearAuth(): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  try {
    await kv.del(AUTH_KEY);
  } catch {
    // non-fatal
  }
}

// --- monitor state ---

export async function getMonitorState(): Promise<ThreadsMonitorState> {
  const kv = getKv();
  if (!kv) {
    return {
      keywordCursor: 0,
      consecutiveFailures: 0,
      lastPollAt: 0,
      lastEmailAt: 0,
      lastEmailCount: 0,
      tokenWarningSent: false,
    };
  }
  try {
    const raw = await kv.get<ThreadsMonitorState>(STATE_KEY);
    return (
      raw ?? {
        keywordCursor: 0,
        consecutiveFailures: 0,
        lastPollAt: 0,
        lastEmailAt: 0,
        lastEmailCount: 0,
        tokenWarningSent: false,
      }
    );
  } catch {
    return {
      keywordCursor: 0,
      consecutiveFailures: 0,
      lastPollAt: 0,
      lastEmailAt: 0,
      lastEmailCount: 0,
      tokenWarningSent: false,
    };
  }
}

export async function setMonitorState(state: ThreadsMonitorState): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  try {
    await kv.set(STATE_KEY, state);
  } catch {
    // non-fatal
  }
}

// --- auto-approve toggles (per category) ---

export async function getAutoApprove(): Promise<Record<string, boolean>> {
  const kv = getKv();
  if (!kv) return {};
  try {
    const raw = await kv.hgetall(AUTOAPPROVE_KEY);
    const out: Record<string, boolean> = {};
    for (const [cat, val] of Object.entries(raw || {})) {
      out[cat] = val === "1";
    }
    return out;
  } catch {
    return {};
  }
}

export async function setAutoApprove(category: string, enabled: boolean): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  try {
    await kv.hset(AUTOAPPROVE_KEY, { [category]: enabled ? "1" : "0" });
  } catch {
    // non-fatal
  }
}
