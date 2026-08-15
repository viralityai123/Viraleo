import { getKv } from "@/lib/kv";
import { THREADS_CONFIG } from "./config";
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

async function listAll(key: string): Promise<unknown[]> {
  const kv = getKv();
  if (!kv) return [];
  try {
    return (await kv.lrange<unknown>(key, 0, -1)) ?? [];
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
  const out: ThreadsLead[] = [];
  for (const raw of items) {
    try {
      const lead =
        typeof raw === "string" ? (JSON.parse(raw) as ThreadsLead) : (raw as ThreadsLead);
      if (lead && typeof lead === "object" && lead.postId && Array.isArray(lead.replyDrafts)) {
        out.push(lead);
      }
    } catch {
      // skip unparsable entries
    }
  }
  return out;
}

/** Two-tier eligibility: fresh (<= freshWindowSec) OR aged (<= maxAgedLeadAgeSec) with zero replies. */
function isLeadEligible(lead: ThreadsLead, nowSec: number): boolean {
  if (!lead.takenAt) return true;
  const ageSec = nowSec - lead.takenAt;
  if (ageSec <= THREADS_CONFIG.freshWindowSec) return true;
  if (ageSec > THREADS_CONFIG.maxAgedLeadAgeSec) return false;
  if (!THREADS_CONFIG.agedRequiresNoReplies) return true;
  return (lead.replyCount ?? 0) === 0;
}

/** Eligible queue (fresh or no-reply aged), ascending by post time. */
export async function listQueueFresh(): Promise<ThreadsLead[]> {
  const leads = await listQueue();
  const nowSec = Date.now() / 1000;
  return leads
    .filter((l) => isLeadEligible(l, nowSec))
    .sort((a, b) => (a.takenAt ?? nowSec) - (b.takenAt ?? nowSec));
}

/** Removes queued leads outside the eligible window. Returns how many were removed. */
export async function purgeExpiredLeads(): Promise<number> {
  const kv = getKv();
  if (!kv) return 0;
  try {
    const raw = await kv.lrange<unknown>(QUEUE_KEY, 0, -1);
    if (!raw || raw.length === 0) return 0;
    const nowSec = Date.now() / 1000;
    const kept: unknown[] = [];
    for (const el of raw) {
      try {
        const lead = typeof el === "string" ? JSON.parse(el) : el;
        if (!lead || typeof lead !== "object" || !("takenAt" in lead)) {
          kept.push(el);
          continue;
        }
        if (isLeadEligible(lead as ThreadsLead, nowSec)) kept.push(el);
      } catch {
        kept.push(el);
      }
    }
    const removed = raw.length - kept.length;
    if (removed > 0) {
      await kv.del(QUEUE_KEY);
      if (kept.length > 0) {
        await kv.rpush(
          QUEUE_KEY,
          ...kept.map((l) => (typeof l === "string" ? l : JSON.stringify(l))),
        );
      }
    }
    return removed;
  } catch {
    return 0;
  }
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
  const items = await listAll(TRACKER_KEY);
  return items.map((raw) => (typeof raw === "string" ? raw : JSON.stringify(raw)));
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
