import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const isAdminBypass =
  (process.env.THREADS_DEV_BYPASS === "1" || !process.env.GOOGLE_CLIENT_ID) &&
  process.env.VERCEL !== "1";

const checkAdmin = createServerFn({ method: "GET" }).handler(async () => {
  if (isAdminBypass) return { ok: true } as const;
  const { requireAuth } = await import("@/lib/auth/server-auth");
  const user = await requireAuth();
  const adminEmail = process.env.ADMIN_EMAIL || "";
  return { ok: Boolean(adminEmail) && user.email === adminEmail } as const;
});

export const Route = createFileRoute("/api/threads/relogin")({
  component: () => null,
  loader: async () => {
    const admin = await checkAdmin();
    if (!admin.ok) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { canAttemptRelogin } = await import("@/lib/threads/relogin");
    const gate = await canAttemptRelogin();
    return new Response(
      JSON.stringify({ ok: true, allowed: gate.allowed, reason: gate.reason }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  },
  action: async () => {
    const admin = await checkAdmin();
    if (!admin.ok) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { canAttemptRelogin, reloginThreadsSession } = await import("@/lib/threads/relogin");
    const gate = await canAttemptRelogin();
    if (!gate.allowed) {
      return new Response(JSON.stringify({ ok: false, error: gate.reason }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
    const result = await reloginThreadsSession();
    return new Response(
      JSON.stringify({ ok: result.ok, needsManual: result.needsManual ?? false, reason: result.reason }),
      {
        status: result.ok ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  },
});