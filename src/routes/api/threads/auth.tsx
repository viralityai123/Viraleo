import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getThreadsAuthUrl, isOAuthConfigured } from "@/lib/threads/oauth";

const checkAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAuth } = await import("@/lib/auth/server-auth");
  const user = await requireAuth();
  const adminEmail = process.env.ADMIN_EMAIL || "";
  return { ok: Boolean(adminEmail) && user.email === adminEmail } as const;
});

export const Route = createFileRoute("/api/threads/auth")({
  component: () => null,
  loader: async () => {
    const admin = await checkAdmin();
    if (!admin.ok) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isOAuthConfigured()) {
      return new Response(
        JSON.stringify({ ok: false, error: "META_APP_ID / META_APP_SECRET not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    const appUrl = (process.env.APP_URL || "https://viraleo.pro").replace(/\/$/, "");
    const redirectUri = `${appUrl}/threads-queue`;
    return new Response(null, {
      status: 302,
      headers: { Location: getThreadsAuthUrl(redirectUri) },
    });
  },
});
