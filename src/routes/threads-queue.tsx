import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { THREADS_CATEGORIES } from "@/lib/threads/taxonomy";
import { THREADS_CONFIG } from "@/lib/threads/config";
import { publishReply } from "@/lib/threads/publisher";
import { exchangeThreadsCode, getThreadsAuthUrl, isOAuthConfigured } from "@/lib/threads/oauth";
import type { ThreadsLead } from "@/lib/threads/types";
import {
  listQueueFresh,
  removeFromQueue,
  getAuth,
  getRepliesToday,
  getAutoApprove,
  setAutoApprove,
  getMonitorState,
  appendTrackerRow,
  trackerRow,
} from "@/lib/threads/store";

interface QueueStatus {
  connected: boolean;
  username?: string;
  expiresAt: number;
  repliesToday: number;
  cap: number;
  queueCount: number;
  autoApprove: Record<string, boolean>;
  oauthConfigured: boolean;
  monitorRunning: boolean;
  lastPollAt: number;
  lastError?: string;
}

async function adminUser() {
  if (
    (process.env.THREADS_DEV_BYPASS === "1" || !process.env.GOOGLE_CLIENT_ID) &&
    process.env.VERCEL !== "1"
  ) {
    return { email: "dev-bypass", id: "dev-bypass" };
  }
  const { requireAuth } = await import("@/lib/auth/server-auth");
  const user = await requireAuth();
  const adminEmail = process.env.ADMIN_EMAIL || "";
  if (!adminEmail || user.email !== adminEmail) throw new Error("FORBIDDEN");
  return user;
}

const getQueueStatus = createServerFn({ method: "GET" }).handler(async () => {
  await adminUser();
  const auth = await getAuth();
  const [repliesToday, autoApprove, state] = await Promise.all([
    getRepliesToday(),
    getAutoApprove(),
    getMonitorState(),
  ]);
  const queueCount = (await listQueueFresh()).length;
  const status: QueueStatus = {
    connected: !!auth?.accessToken,
    username: auth?.username || auth?.userId,
    expiresAt: auth?.expiresAt || 0,
    repliesToday,
    cap: THREADS_CONFIG.dailyReplyCap,
    queueCount,
    autoApprove,
    oauthConfigured: isOAuthConfigured(),
    monitorRunning: state.lastPollAt > 0,
    lastPollAt: state.lastPollAt,
    lastError: state.lastError,
  };
  return status;
});

const getQueueLeads = createServerFn({ method: "GET" }).handler(async () => {
  await adminUser();
  return listQueueFresh();
});

const approveLead = createServerFn({ method: "POST" })
  .inputValidator((d: { postId: string; draft: string }) => d)
  .handler(async ({ data }) => {
    await adminUser();
    const leads = await listQueueFresh();
    const lead = leads.find((l) => l.postId === data.postId);
    if (!lead) return { ok: false as const, error: "Lead no longer in queue" };
    const result = await publishReply(lead.postId, data.draft.slice(0, 500));
    if (!result.ok) return { ok: false as const, error: result.error || "Reply failed" };
    await removeFromQueue(lead);
    lead.status = "approved";
    lead.replyId = result.replyId || "";
    lead.repliedAt = Date.now();
    await appendTrackerRow(trackerRow(lead, result.replyId || "", "approved"));
    return { ok: true as const, replyId: result.replyId };
  });

const skipLead = createServerFn({ method: "POST" })
  .inputValidator((d: { postId: string }) => d)
  .handler(async ({ data }) => {
    await adminUser();
    const leads = await listQueueFresh();
    const lead = leads.find((l) => l.postId === data.postId);
    if (!lead) return { ok: false as const, error: "Lead no longer in queue" };
    await removeFromQueue(lead);
    return { ok: true as const };
  });

const setCategoryAutoApprove = createServerFn({ method: "POST" })
  .inputValidator((d: { category: string; enabled: boolean }) => d)
  .handler(async ({ data }) => {
    await adminUser();
    await setAutoApprove(data.category, data.enabled);
    return { ok: true as const };
  });

const exchangeAuthCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; redirectUri: string }) => d)
  .handler(async ({ data }) => {
    await adminUser();
    return exchangeThreadsCode(data.code, data.redirectUri);
  });

const getConnectUrl = createServerFn({ method: "GET" }).handler(async () => {
  await adminUser();
  if (!isOAuthConfigured()) {
    return { ok: false as const, error: "META_APP_ID / META_APP_SECRET not configured" };
  }
  const appUrl = (process.env.APP_URL || "https://viraleo.pro").replace(/\/$/, "");
  return { ok: true as const, url: getThreadsAuthUrl(`${appUrl}/threads-queue`) };
});

export const Route = createFileRoute("/threads-queue")({
  head: () => ({
    meta: [
      { title: "Threads Lead Queue — Viraleo" },
      { name: "description", content: "Approve AI-drafted replies to fresh Threads leads." },
    ],
  }),
  component: ThreadsQueuePage,
});

function ThreadsQueuePage() {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [leads, setLeads] = useState<ThreadsLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draftChoice, setDraftChoice] = useState<Record<string, number>>({});

  const loadAll = useMemo(
    () => async () => {
      try {
        const [s, l] = await Promise.all([getQueueStatus(), getQueueLeads()]);
        setStatus(s);
        setLeads(l);
        setAuthError(null);
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      exchangeAuthCode({ data: { code, redirectUri: `${window.location.origin}/threads-queue` } })
        .then((res) => {
          if (res.ok) toast.success("Threads account connected!");
          else toast.error(res.error || "Connection failed");
          window.history.replaceState({}, "", "/threads-queue");
        })
        .finally(() => loadAll());
    } else {
      loadAll();
    }
  }, [loadAll]);

  const connect = async () => {
    setConnecting(true);
    try {
      const res = await getConnectUrl();
      if (res.ok) window.location.href = res.url;
      else toast.error(res.error || "Not configured yet");
    } finally {
      setConnecting(false);
    }
  };

  const approve = async (lead: ThreadsLead) => {
    setBusyId(lead.postId);
    const idx = draftChoice[lead.postId] ?? 0;
    const draft = lead.replyDrafts[idx] || lead.replyDrafts[0];
    try {
      const res = await approveLead({ data: { postId: lead.postId, draft } });
      if (res.ok) {
        toast.success(`Replied to @${lead.username}`);
        setLeads((prev) => prev.filter((l) => l.postId !== lead.postId));
        loadAll();
      } else {
        toast.error(res.error || "Reply failed");
      }
    } finally {
      setBusyId(null);
    }
  };

  const copyDraft = async (lead: ThreadsLead) => {
    const idx = draftChoice[lead.postId] ?? 0;
    const draft = lead.replyDrafts[idx] || lead.replyDrafts[0];
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("Draft copied — paste it on the thread");
    } catch {
      toast.error("Couldn't copy — select the draft text manually");
    }
  };

  const skip = async (lead: ThreadsLead) => {
    setBusyId(lead.postId);
    try {
      await skipLead({ data: { postId: lead.postId } });
      setLeads((prev) => prev.filter((l) => l.postId !== lead.postId));
      loadAll();
    } finally {
      setBusyId(null);
    }
  };

  const toggleAuto = async (category: string, enabled: boolean) => {
    await setCategoryAutoApprove({ data: { category, enabled } });
    setStatus((prev) =>
      prev ? { ...prev, autoApprove: { ...prev.autoApprove, [category]: enabled } } : prev,
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <span className="text-2xl text-red-600">!</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Sign in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page is admin-only. Sign in with your Viraleo account first.
          </p>
          <a
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  const tokenDaysLeft =
    status && status.expiresAt > 0 ? Math.floor((status.expiresAt - Date.now()) / 86400000) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Threads Lead Queue</h1>
            <p className="text-sm text-muted-foreground">
              {status?.monitorRunning ? "Monitor running 24/7" : "Monitor not started"}
              {status?.connected
                ? ""
                : " · Manual mode: copy the draft, open the thread, reply on Threads"}
              {status?.lastError ? ` · last error: ${status.lastError}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/threads/export"
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
              Export CSV
            </a>
            {status?.connected ? (
              <span className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-500">
                {status.username} · {tokenDaysLeft}d token
              </span>
            ) : (
              <button
                onClick={connect}
                disabled={connecting}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                {connecting ? "Connecting..." : "Connect Threads account"}
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border p-4">
            <div className="text-2xl font-bold text-foreground">{leads.length}</div>
            <div className="text-xs text-muted-foreground">In queue</div>
          </div>
          <div className="rounded-xl border border-border p-4">
            <div className="text-2xl font-bold text-foreground">
              {status?.repliesToday ?? 0}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {status?.cap ?? THREADS_CONFIG.dailyReplyCap}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Replies today</div>
          </div>
          <div className="rounded-xl border border-border p-4">
            <div className="text-2xl font-bold text-foreground">
              {status?.autoApprove ? Object.values(status.autoApprove).filter(Boolean).length : 0}
            </div>
            <div className="text-xs text-muted-foreground">Auto-approve on</div>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-border p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Auto-approve categories (score ≥ {THREADS_CONFIG.autoApproveThreshold} posts instantly)
            {!status?.connected && (
              <span className="ml-2 font-normal normal-case text-amber-500">
                — needs a connected Threads account (manual mode: replies fire via "Approve & reply"
                after connecting later)
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {THREADS_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleAuto(cat.id, !(status?.autoApprove?.[cat.id] ?? false))}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  status?.autoApprove?.[cat.id]
                    ? "bg-emerald-500 text-white"
                    : "border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <div className="text-3xl">🧵</div>
            <p className="mt-2 text-sm text-muted-foreground">
              No leads yet. The monitor sweeps Threads 24/7 for buying-intent posts — fresh
              (&lt;1h old) or up to 7 days old with zero replies. New leads land here within
              minutes of detection.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => {
              const idx = draftChoice[lead.postId] ?? 0;
              return (
                <div key={lead.postId} className="rounded-xl border border-border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">@{lead.username}</span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {lead.category}
                      </span>
                      {lead.takenAt &&
                        Date.now() / 1000 - lead.takenAt <= THREADS_CONFIG.freshWindowSec && (
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-500">
                            Fresh
                          </span>
                        )}
                      <span className="text-xs text-muted-foreground">
                        {lead.takenAt
                          ? formatDistanceToNow(lead.takenAt * 1000, { addSuffix: true })
                          : "recent"}
                      </span>
                      {lead.replyCount !== undefined && lead.replyCount === 0 && (
                        <span className="text-xs text-muted-foreground">· 0 replies</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                          lead.intentScore >= THREADS_CONFIG.autoApproveThreshold
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-amber-500/15 text-amber-500"
                        }`}
                      >
                        {lead.intentScore}
                      </span>
                      <a
                        href={lead.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-500 hover:underline"
                      >
                        Open thread ↗
                      </a>
                    </div>
                  </div>
                  <p className="mb-3 text-sm leading-relaxed text-foreground/90">{lead.text}</p>
                  <div className="mb-3 flex gap-2">
                    {lead.replyDrafts.map((draft, i) => (
                      <button
                        key={i}
                        onClick={() => setDraftChoice((prev) => ({ ...prev, [lead.postId]: i }))}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          idx === i
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Draft {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => copyDraft(lead)}
                      className="ml-auto rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/20"
                    >
                      Copy draft
                    </button>
                  </div>
                  <p className="mb-3 rounded-lg bg-muted/50 p-3 text-sm italic text-muted-foreground">
                    “{(lead.replyDrafts[idx] || lead.replyDrafts[0]).slice(0, 300)}”
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {status?.connected ? (
                      <button
                        onClick={() => approve(lead)}
                        disabled={busyId === lead.postId}
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {busyId === lead.postId ? "Posting..." : "Approve & reply"}
                      </button>
                    ) : (
                      <a
                        href={lead.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        Open thread & reply →
                      </a>
                    )}
                    <button
                      onClick={() => copyDraft(lead)}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                    >
                      Copy draft
                    </button>
                    <button
                      onClick={() => skip(lead)}
                      disabled={busyId === lead.postId}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
