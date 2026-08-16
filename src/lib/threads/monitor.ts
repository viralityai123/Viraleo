import { THREADS_CONFIG, isMonitorEnabled } from "./config";
import { searchKeyword, searchExplore, searchThreadsLatest, buildPostUrl } from "./fetcher";
import { scorePost } from "./scorer";
import { publishReply } from "./publisher";
import { getAuth } from "./store";
import { refreshAccessToken } from "./publisher";
import { hasBuyingIntent, isExcludedPost, THREADS_CATEGORIES } from "./taxonomy";
import { recommendFiverrGig } from "./fiverr";
import { sendThreadsAlert, sendThreadsLeadAlert } from "@/lib/email";
import type { ThreadsLead, ThreadsRawPost, ThreadsMonitorState, ThreadsSource } from "./types";
import {
  getMonitorState,
  setMonitorState,
  isSeen,
  markSeen,
  pushLead,
  countQueue,
  purgeExpiredLeads,
  getRepliesToday,
  incrementReplies,
  getAutoApprove,
  appendTrackerRow,
  trackerRow,
  getRepliedPostUrls,
  isKvReady,
} from "./store";

const TAG = "[threads-monitor]";

let started = false;
let running = false;

function log(...args: unknown[]) {
  console.log(TAG, ...args);
}

function categoryLabel(id: string): string {
  return THREADS_CATEGORIES.find((c) => c.id === id)?.label || id;
}

async function checkTokenHealth(): Promise<void> {
  const auth = await getAuth();
  if (!auth) return;
  const state = await getMonitorState();
  if (Date.now() >= auth.expiresAt) {
    if (!state.tokenWarningSent) {
      await sendThreadsAlert(
        "Threads token expired",
        `Your Threads access token expired. Reconnect: sign in to /threads-queue and press "Connect Threads account".`,
      );
      await setMonitorState({ ...state, tokenWarningSent: true });
    }
    return;
  }
  if (Date.now() >= auth.expiresAt - 7 * 24 * 60 * 60 * 1000) {
    const refreshed = await refreshAccessToken(auth.accessToken);
    if (!refreshed) {
      await sendThreadsAlert(
        "Threads token refresh failed",
        "The long-lived token could not be refreshed automatically. Reconnect at /threads-queue before it expires.",
      );
    }
  }
}

function categoryAutoApproveEnabled(
  autoApprove: Record<string, boolean>,
  category: string,
): boolean {
  return autoApprove[category] === true;
}

/**
 * One full poll cycle. Fetches a rotating slice of keywords, pre-filters,
 * LLM-scores candidates, queues high-intent leads (or auto-publishes),
 * and sends digest alerts.
 */
export async function pollOnce(): Promise<void> {
  if (running) return;
  running = true;
  const cycleStarted = Date.now();
  try {
    const state = await getMonitorState();
    const kvReady = isKvReady();
    if (!kvReady) {
      log("KV not configured — skipping cycle");
      await setMonitorState({ ...state, lastPollAt: Date.now() });
      return;
    }
    const recoveryUntil = state.recoveryUntil ?? 0;

    if (Date.now() < recoveryUntil) {
      if (Date.now() - lastProbeAt >= THREADS_CONFIG.probeIntervalMs) {
        lastProbeAt = Date.now();
        try {
          const probe = await searchThreadsLatest("website design");
          if (probe.posts && probe.posts.length > 0) {
            await setMonitorState({ ...state, recoveryUntil: 0, lastPollAt: Date.now() });
            log("session recovered — resuming full cycles");
          } else {
            log(
              `session still down (${probe.blocked ? "blocked" : "no payload"}) — staying in recovery pause`,
            );
          }
        } catch {
          log("probe failed — staying in recovery pause");
        }
      }
      await setMonitorState({ ...state, lastPollAt: Date.now() });
      return;
    }

    await checkTokenHealth();

    const allKeywords = THREADS_CATEGORIES.flatMap((c) => c.keywords);
    if (allKeywords.length === 0) return;

    const perCycle =
      THREADS_CONFIG.keywordsPerCycle > 0
        ? Math.min(THREADS_CONFIG.keywordsPerCycle, allKeywords.length)
        : allKeywords.length;
    const keywords: string[] = [];
    for (let i = 0; i < perCycle; i++) {
      const idx = (state.keywordCursor + i) % allKeywords.length;
      keywords.push(allKeywords[idx]);
    }
    const nextCursor = (state.keywordCursor + perCycle) % allKeywords.length;

    const cycleFailures: string[] = [];
    let lastSource: ThreadsSource = "ssr";
    let fetched = 0;
    let freshFound = 0;
    let agedNoReplyFound = 0;
    const candidates: { post: ThreadsRawPost; matched: string }[] = [];

    const concurrency = Math.max(1, THREADS_CONFIG.keywordConcurrency);
    let nextIdx = 0;
    let blockedCount = 0;
    const consider = async (posts: ThreadsRawPost[]) => {
      const fresh: { post: ThreadsRawPost; matched: string }[] = [];
      for (const post of posts) {
        if (
          THREADS_CONFIG.ownUsername &&
          post.username?.toLowerCase() === THREADS_CONFIG.ownUsername
        ) {
          continue;
        }
        if (!post.text) continue;
        if (isExcludedPost(post.text)) {
          await markSeen([post.id]);
          continue;
        }
        if (post.takenAt) {
          const ageSec = Date.now() / 1000 - post.takenAt;
          if (ageSec > THREADS_CONFIG.maxAgedLeadAgeSec) continue;
          if (ageSec <= THREADS_CONFIG.freshWindowSec) {
            freshFound++;
          } else {
            if (THREADS_CONFIG.agedRequiresNoReplies && (post.replyCount ?? 0) > 0) {
              continue;
            }
            agedNoReplyFound++;
          }
        }
        const matched = hasBuyingIntent(post.text);
        if (!matched) continue;
        if (await isSeen(post.id)) continue;
        fresh.push({ post, matched });
      }
      candidates.push(...fresh);
    };
    const worker = async () => {
      while (true) {
        const idx = nextIdx++;
        if (idx >= keywords.length) return;
        const keyword = keywords[idx];
        try {
          const { posts, source, blocked } = await searchKeyword(
            keyword,
            state.consecutiveFailures,
          );
          if (blocked) blockedCount++;
          fetched += posts.length;
          lastSource = source;
          if (posts.length > 0) await consider(posts);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          cycleFailures.push(msg);
          log("keyword failed:", keyword, "-", msg);
        }
        await new Promise((r) =>
          setTimeout(
            r,
            THREADS_CONFIG.requestJitterMs + Math.random() * THREADS_CONFIG.requestJitterMs,
          ),
        );
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(concurrency, keywords.length) }, () => worker()),
    );

    for (let e = 0; e < THREADS_CONFIG.explorePerCycle; e++) {
      try {
        const ex = await searchExplore();
        if (ex.posts && ex.posts.length > 0) {
          fetched += ex.posts.length;
          await consider(ex.posts);
        }
      } catch {
        // explore is a bonus surface; failures are non-fatal
      }
    }

    if (keywords.length > 0 && blockedCount / keywords.length >= THREADS_CONFIG.blockedRatio) {
      if (fetched === 0) {
        const nextState = {
          ...state,
          recoveryUntil: Date.now() + THREADS_CONFIG.recoveryBackoffMs,
          lastPollAt: Date.now(),
          keywordCursor: nextCursor,
        };
        lastProbeAt = 0;
        await setMonitorState(nextState);
        log(
          `cycle fetched 0 posts (${blockedCount}/${keywords.length} blocked) — recovery pause ${Math.round(THREADS_CONFIG.recoveryBackoffMs / 60_000)}min`,
        );
      } else {
        throttleBackoffMs = THREADS_CONFIG.blockedBackoffMs;
        log(
          `session rate-limited (${blockedCount}/${keywords.length} keywords blocked) — backing off ${Math.round(throttleBackoffMs / 1000)}s`,
        );
      }
    } else {
      throttleBackoffMs = 0;
    }

    candidates.sort((a, b) => (a.post.takenAt ?? 0) - (b.post.takenAt ?? 0));

    const deduped: { post: ThreadsRawPost; matched: string }[] = [];
    const seenIds = new Set<string>();
    for (const c of candidates) {
      if (seenIds.has(c.post.id)) continue;
      seenIds.add(c.post.id);
      deduped.push(c);
    }
    const toScore = deduped.slice(0, THREADS_CONFIG.llmCallsPerCycle);
    const autoApprove = await getAutoApprove();
    const repliesToday = await getRepliesToday();
    const repliedPostUrls = await getRepliedPostUrls();
    const newLeads: ThreadsLead[] = [];

    const scoredResults = new Array<Awaited<ReturnType<typeof scorePost>>>(toScore.length);
    let scoreIdx = 0;
    const scoreWorkers = Array.from(
      { length: Math.min(6, toScore.length) },
      async () => {
        while (true) {
          const i = scoreIdx++;
          if (i >= toScore.length) return;
          const { post, matched } = toScore[i];
          scoredResults[i] = await scorePost(
            post.username || "",
            post.text || "",
            matched,
          );
          await markSeen([post.id]);
        }
      },
    );
    await Promise.all(scoreWorkers);

    for (let i = 0; i < toScore.length; i++) {
      const scored = scoredResults[i];
      const { post, matched } = toScore[i];
      if (!scored) continue;
      if (scored.intentScore < THREADS_CONFIG.intentThreshold) continue;
      if (scored.category === "other" && scored.intentScore < THREADS_CONFIG.autoApproveThreshold) {
        continue;
      }
      const drafts = [scored.draftA, scored.draftB].filter((d) => d && d.length > 10);
      if (drafts.length === 0) continue;

      const postUrl = buildPostUrl(post);
      if (repliedPostUrls.has(postUrl)) {
        log("already replied, skipping:", post.username || "unknown", postUrl);
        continue;
      }

      const lead: ThreadsLead = {
        postId: post.id,
        postUrl,
        username: post.username || "unknown",
        text: (post.text || "").slice(0, 600),
        category: scored.category,
        intentScore: scored.intentScore,
        takenAt: post.takenAt || 0,
        foundAt: Date.now(),
        source: lastSource,
        matchedKeyword: matched,
        replyDrafts: drafts,
        status: "queued",
        replyCount: post.replyCount ?? 0,
        fiverrGig: recommendFiverrGig(scored.category),
      };

      const canAutoApprove =
        scored.intentScore >= THREADS_CONFIG.autoApproveThreshold &&
        categoryAutoApproveEnabled(autoApprove, scored.category) &&
        repliesToday + newLeads.filter((l) => l.status === "approved").length <
          THREADS_CONFIG.dailyReplyCap;

      if (canAutoApprove) {
        const result = await publishReply(post.id, drafts[0]);
        if (result.ok) {
          lead.status = "approved";
          lead.replyId = result.replyId || "";
          lead.repliedAt = Date.now();
          await incrementReplies();
          await appendTrackerRow(trackerRow(lead, result.replyId || "", "auto-approved"));
          log("auto-approved reply for", lead.username, "on", lead.category);
          continue;
        }
        lead.error = result.error;
      }

      await pushLead(lead);
      newLeads.push(lead);
      log("queued lead:", lead.username, `(${scored.category}, ${scored.intentScore})`);
    }

    if (newLeads.length > 0) {
      const now = Date.now();
      if (now - state.lastEmailAt >= THREADS_CONFIG.emailMinGapMs) {
        const emailLeads = newLeads.slice(0, THREADS_CONFIG.emailMaxLeads).map((l) => ({
          username: l.username,
          postUrl: l.postUrl,
          category: categoryLabel(l.category),
          intentScore: l.intentScore,
          draft: l.replyDrafts[0] || "",
        }));
        await sendThreadsLeadAlert(emailLeads, repliesToday + 1);
        await setMonitorState({
          ...state,
          lastEmailAt: now,
          lastEmailCount: newLeads.length,
          lastPollAt: Date.now(),
          keywordCursor: nextCursor,
          consecutiveFailures: 0,
          lastError: undefined,
        });
      } else {
        await setMonitorState({
          ...state,
          lastPollAt: Date.now(),
          keywordCursor: nextCursor,
          consecutiveFailures: 0,
          lastError: undefined,
        });
      }
    } else if (cycleFailures.length > 0) {
      const newFailures = state.consecutiveFailures + cycleFailures.length;
      const nextState: ThreadsMonitorState = {
        ...state,
        lastPollAt: Date.now(),
        keywordCursor: nextCursor,
        consecutiveFailures: newFailures,
        lastError: cycleFailures[0],
      };
      if (newFailures >= THREADS_CONFIG.errorEmailAfterFailures) {
        await sendThreadsAlert(
          "Threads monitor in trouble",
          `Poll cycle failed on ${newFailures} consecutive keyword searches. Last error: ${cycleFailures[0]}. Scraper shape may have changed.`,
        );
        nextState.consecutiveFailures = 0;
      }
      await setMonitorState(nextState);
      log("cycle finished with", cycleFailures.length, "keyword failures");
    } else {
      await setMonitorState({
        ...state,
        lastPollAt: Date.now(),
        keywordCursor: nextCursor,
        consecutiveFailures: 0,
        lastError: undefined,
      });
    }

    lastCycleFetched = fetched;

    const purged = await purgeExpiredLeads();

    log(
      `cycle done in ${((Date.now() - cycleStarted) / 1000).toFixed(1)}s — fetched ${fetched}, fresh ${freshFound}, aged-no-reply ${agedNoReplyFound}, candidates ${candidates.length}, new leads ${newLeads.length}, purged ${purged}, queue total ${await countQueue()}, replies today ${await getRepliesToday()}`,
    );
  } catch (e) {
    log("cycle crashed:", e);
    try {
      await sendThreadsAlert(
        "Threads monitor crashed",
        e instanceof Error ? e.stack || e.message : String(e),
      );
    } catch {
      // ignore
    }
  } finally {
    lastCycleAllFailed = lastCycleFetched === 0;
    running = false;
  }
}

let allFailedCycles = 0;
let lastCycleAllFailed = false;
let lastCycleFetched = 0;
let throttleBackoffMs = 0;
let lastProbeAt = 0;

/** Starts the 24/7 monitor loop. Only runs on long-lived processes (Koyeb), never on Vercel. */
export function startThreadsMonitor(): void {
  if (started) return;
  if (!isMonitorEnabled()) return;
  started = true;
  log("starting monitor loop");
  const schedule = (delayMs: number) => {
    setTimeout(() => {
      pollOnce()
        .catch((e) => log("poll failed:", e))
        .finally(() => {
          if (lastCycleAllFailed) allFailedCycles = Math.min(allFailedCycles + 1, 4);
          else allFailedCycles = 0;
          const extraBackoff = lastCycleAllFailed ? allFailedCycles * 30_000 : 0;
          schedule(THREADS_CONFIG.pollIntervalMs + extraBackoff + throttleBackoffMs);
        });
    }, delayMs);
  };
  schedule(0);
}
