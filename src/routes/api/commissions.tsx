import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getAllCommissions, getCommissionsForReferrer, getTotalEarned } from "@/lib/partner-store";

const fetchAllCommissions = createServerFn({ method: "GET" }).handler(async () => {
  const all = await getAllCommissions();
  const totalEarned = await getTotalEarned();
  return {
    ok: true as const,
    count: all.length,
    totalEarned,
    commissions: all.slice(0, 100),
  };
});

const fetchCommissionsByRef = createServerFn({ method: "POST" })
  .inputValidator((d: { ref: string }) => d)
  .handler(async ({ data }) => {
    const commissions = await getCommissionsForReferrer(data.ref);
    const totalEarned = await getTotalEarned(data.ref);
    return {
      ok: true as const,
      totalEarned,
      totalReferrals: commissions.length,
      commissions,
    };
  });

export { fetchAllCommissions, fetchCommissionsByRef };

export const Route = createFileRoute("/api/commissions")({
  component: () => null,
  loader: async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return new Response(JSON.stringify({ ok: false, error: "Not configured" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    const all = await getAllCommissions();
    const totalEarned = await getTotalEarned();
    return new Response(
      JSON.stringify({ ok: true, count: all.length, totalEarned, commissions: all.slice(0, 100) }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  },
});
