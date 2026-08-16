import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { listTrackerRows } from "@/lib/threads/store";

const HEADER =
  "date_found,handle,post_url,category,intent_score,matched_keyword,source,reply_id,status,reply_text";

const checkAdmin = createServerFn({ method: "GET" }).handler(async () => {
  if (
    (process.env.THREADS_DEV_BYPASS === "1" || !process.env.GOOGLE_CLIENT_ID) &&
    process.env.VERCEL !== "1"
  ) {
    return { ok: true } as const;
  }
  const { requireAuth } = await import("@/lib/auth/server-auth");
  const user = await requireAuth();
  const adminEmail = process.env.ADMIN_EMAIL || "";
  return { ok: Boolean(adminEmail) && user.email === adminEmail } as const;
});

export const Route = createFileRoute("/api/threads/export")({
  component: () => null,
  loader: async () => {
    const admin = await checkAdmin();
    if (!admin.ok) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    const rows = await listTrackerRows();
    const csv = [HEADER, ...rows].join("\n");
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="threads-tracker.csv"`,
      },
    });
  },
});
