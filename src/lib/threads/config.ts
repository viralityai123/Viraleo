function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const THREADS_CONFIG = {
  /** How often the monitor loop polls Threads. Lower = faster catch, more requests. */
  pollIntervalMs: int("THREADS_POLL_INTERVAL_MS", 30_000),
  /** How many keywords to search per cycle. 0 = sweep the ENTIRE keyword list every cycle (fastest catch, more requests). */
  keywordsPerCycle: int("THREADS_KEYWORDS_PER_CYCLE", 0),
  /** How many keyword searches to run in parallel. Lower = gentler on rate limits. */
  keywordConcurrency: int("THREADS_KEYWORD_CONCURRENCY", 2),
  /** Minimum LLM intent score (0-100) for a lead to hit the queue. */
  intentThreshold: int("THREADS_INTENT_THRESHOLD", 50),
  /** Fresh window (seconds): posts this new are always eligible. */
  freshWindowSec: int("THREADS_FRESH_WINDOW_SEC", 60 * 60),
  /** Aged window (seconds): posts up to this old are eligible only when they have zero replies. */
  maxAgedLeadAgeSec: int("THREADS_MAX_AGED_LEAD_AGE_SEC", 7 * 24 * 60 * 60),
  /** Require zero replies for aged (non-fresh) posts. */
  agedRequiresNoReplies: process.env.THREADS_AGED_REQUIRES_NO_REPLIES !== "0",
  /** Base jitter between keyword requests (ms). Lower = faster sweep, more aggressive. */
  requestJitterMs: int("THREADS_REQUEST_JITTER_MS", 1500),
  /** Ratio of blocked (429/403) keywords that triggers a polling pause. */
  blockedRatio: (() => {
    const raw = Number(process.env.THREADS_BLOCKED_RATIO);
    return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 0.5;
  })(),
  /** How long to pause polling after a high blocked-ratio cycle (ms). */
  blockedBackoffMs: int("THREADS_BLOCKED_BACKOFF_MS", 5 * 60_000),
  /** Score at or above which auto-approve fires (when a category is toggled on). */
  autoApproveThreshold: int("THREADS_AUTOAPPROVE_THRESHOLD", 50),
  /** Hard cap on auto-posted replies per 24h — protects the account from spam flags. */
  dailyReplyCap: int("THREADS_DAILY_REPLY_CAP", 20),
  /** Max Gemini scoring calls per cycle. */
  llmCallsPerCycle: int("THREADS_LLM_CALLS_PER_CYCLE", 240),
  /** Min gap between lead alert emails. */
  emailMinGapMs: 10 * 60_000,
  /** Max leads included in a single alert email. */
  emailMaxLeads: 5,
  /** Your own Threads username — its posts are never queued. */
  ownUsername: (process.env.THREADS_USERNAME || "").toLowerCase(),
  maxResultsPerKeyword: 30,
  fetchTimeoutMs: 15_000,
  /** Consecutive failures before an error email is fired. */
  errorEmailAfterFailures: 12,
} as const;

export function isMonitorEnabled(): boolean {
  return process.env.THREADS_MONITOR_ENABLED === "1" && process.env.VERCEL !== "1";
}
