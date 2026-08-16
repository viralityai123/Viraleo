import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { clearActivities, purgeLegacySharedKeys } from "@/lib/activity";

const wipeAllUserData = createServerFn({ method: "POST" })
  .inputValidator((d: { secret: string }) => d)
  .handler(async ({ data }) => {
    // Secret is read server-side from env — never hardcoded in source
    const expectedSecret = process.env.DESTROY_SECRET || "";
    if (!expectedSecret || data.secret !== expectedSecret) {
      return { ok: false, error: "Invalid secret" };
    }
    const { clearAllPlanData } = await import("@/lib/user-plan");
    const deleted = await clearAllPlanData();
    return { ok: true, deleted };
  });

export const Route = createFileRoute("/destroy")({
  validateSearch: (s: Record<string, unknown>) => ({
    key: typeof s.key === "string" ? s.key : typeof s.destroy === "string" ? s.destroy : "",
  }),
  component: DestroyPage,
});

function DestroyPage() {
  const { key } = Route.useSearch();
  const [status, setStatus] = useState<"working" | "done" | "denied">("working");
  const [deleted, setDeleted] = useState(0);

  useEffect(() => {
    const secret = key || new URLSearchParams(window.location.search).get("destroy") || "";
    if (!secret) {
      setStatus("denied");
      return;
    }
    // Secret is validated server-side against DESTROY_SECRET env var
    wipeAllUserData({ data: { secret } })
      .then((res) => {
        if (res.ok) {
          clearActivities();
          purgeLegacySharedKeys();
          const toRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            if (k.startsWith("viraleo:activity") || k.startsWith("viraleo:result:")) {
              toRemove.push(k);
            }
          }
          toRemove.forEach((k) => localStorage.removeItem(k));
          setDeleted(res.deleted ?? 0);
          setStatus("done");
        } else {
          setStatus("denied");
        }
      })
      .catch(() => setStatus("denied"));
  }, [key]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center">
        {status === "working" && (
          <>
            <div className="mx-auto size-10 rounded-full border-2 border-ink/10 border-t-ink animate-spin mb-4" />
            <p className="text-sm text-ink-soft">Wiping all plan and usage data…</p>
          </>
        )}
        {status === "done" && (
          <>
            <h1 className="text-2xl font-bold text-ink">Fresh start complete</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Cleared {deleted} KV records (plans + usage). All users start clean.
            </p>
          </>
        )}
        {status === "denied" && (
          <>
            <h1 className="text-2xl font-bold text-ink">Access denied</h1>
            <p className="mt-2 text-sm text-ink-soft">Invalid or missing destroy key.</p>
          </>
        )}
      </div>
    </div>
  );
}
