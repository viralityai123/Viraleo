import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getSessionFromDocument, getSessionToken, verifySession, type SessionPayload } from "@/lib/auth/session";
import { getAllPartnersSlugs, getPartnerAnalytics, getAllCommissions, type CommissionEvent } from "@/lib/partner-store";

interface AdminOverview {
  totalPartners: number;
  totalCommissions: number;
  totalEarned: number;
  totalPending: number;
  recentCommissions: CommissionEvent[];
  recentPartners: { slug: string; name: string; createdAt: number }[];
}

const getAdminEmail = createServerFn({ method: "GET" }).handler(async () => {
  return process.env.ADMIN_EMAIL || "";
});

const getAdminOverview = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const adminEmail = process.env.ADMIN_EMAIL || "";
    const jwtSecret = process.env.JWT_SECRET || "";
    const session = await verifySession(data.token, jwtSecret);
    if (!session || session.email !== adminEmail) {
      throw new Error("Unauthorized");
    }
    const slugs = await getAllPartnersSlugs();
    let totalCommissions = 0;
    let totalEarned = 0;
    let totalPending = 0;
    const recentPartners: { slug: string; name: string; createdAt: number }[] = [];

    for (const slug of slugs) {
      const partnerData = await getPartnerAnalytics(slug);
      if (!partnerData) continue;
      totalCommissions += partnerData.totalCommissions;
      totalEarned += partnerData.totalEarned;
      const unpaid = partnerData.commissions.filter((c) => !c.paid);
      totalPending += unpaid.reduce((s, c) => s + c.amount, 0);
      recentPartners.push({ slug, name: partnerData.name, createdAt: partnerData.createdAt });
    }

    recentPartners.sort((a, b) => b.createdAt - a.createdAt);
    const commissions = await getAllCommissions();
    const recentCommissions = commissions.slice(0, 20);

    return {
      totalPartners: slugs.length,
      totalCommissions,
      totalEarned,
      totalPending,
      recentCommissions,
      recentPartners: recentPartners.slice(0, 10),
    } satisfies AdminOverview;
  });

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Viraleo" },
      { name: "description", content: "Admin overview dashboard for Viraleo." },
      { property: "og:title", content: "Admin Dashboard — Viraleo" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/admin/dashboard" }],
  }),
  component: AdminDashboardPage,
});

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

function AdminDashboardPage() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getSessionFromDocument();
    setSession(s);
    const token = getSessionToken() || "";

    getAdminEmail().then((adminEmail) => {
      if (!s || !adminEmail || s.email !== adminEmail) {
        setLoading(false);
        return;
      }
      setIsAdmin(true);
      getAdminOverview({ data: { token } }).then((d) => {
        setData(d);
        setLoading(false);
      });
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="text-sm text-emerald-700 font-medium">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Access denied</h2>
          <p className="text-sm text-gray-500">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const name = session?.name || "Admin";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || name.slice(0, 2).toUpperCase();

  return (
    <div className="pd">
      <style>{adminCss}</style>
      <div className="topbar">
        <div className="tb-logo"><span>Viraleo</span> Admin</div>
        <div className="tb-right">
          <div className="tb-nav">
            <Link to="/admin/dashboard" className="tb-nav-link active">Dashboard</Link>
            <Link to="/admin/payouts" className="tb-nav-link">Payouts</Link>
          </div>
          <div className="tb-avatar">{initials}</div>
        </div>
      </div>

      <div className="inner">
        <div className="greeting">
          <div className="greeting-sub">Welcome back, {name.split(" ")[0]} —</div>
          <div className="greeting-h">Admin <em>overview</em></div>
        </div>

        <div className="metric-row">
          <div className="metric-card">
            <div className="metric-label">Total partners</div>
            <div className="metric-val green">{data?.totalPartners || 0}</div>
            <div className="metric-delta">↑ Registered</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total commissions</div>
            <div className="metric-val">{data?.totalCommissions || 0}</div>
            <div className="metric-delta">↑ All time</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total earned</div>
            <div className="metric-val green">{fmt(data?.totalEarned || 0)}</div>
            <div className="metric-delta">↑ All time</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Pending payouts</div>
            <div className="metric-val" style={{ color: (data?.totalPending || 0) > 0 ? "#dc2626" : undefined }}>
              {fmt(data?.totalPending || 0)}
            </div>
            <div className="metric-delta">↑ Unpaid</div>
          </div>
        </div>

        <div className="grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div className="card">
            <div className="card-title">
              Recent commissions
              <span className="card-title-pill">{data?.recentCommissions.length || 0}</span>
            </div>
            {data && data.recentCommissions.length > 0 ? (
              <div>
                <div style={{
                  display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
                  gap: 8, padding: "8px 0", borderBottom: "0.5px solid var(--border)",
                  fontSize: 11, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  <span>Partner</span>
                  <span style={{ textAlign: "right" }}>Amount</span>
                  <span style={{ textAlign: "right" }}>Date</span>
                  <span style={{ textAlign: "center" }}>Status</span>
                </div>
                {data.recentCommissions.slice(0, 10).map((c) => (
                  <div key={c.id} style={{
                    display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
                    gap: 8, padding: "10px 0", borderBottom: "0.5px solid var(--border)",
                    fontSize: 13, color: "var(--ink2)",
                  }}>
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>{c.referralSlug || "—"}</span>
                    <span style={{ textAlign: "right", fontWeight: 700 }}>{fmt(c.amount)}</span>
                    <span style={{ textAlign: "right", fontSize: 12 }}>{new Date(c.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: c.paid ? "#059669" : "#dc2626" }}>
                      {c.paid ? "Paid" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No commissions yet</div>
            )}
          </div>

          <div className="card">
            <div className="card-title">
              Recent partners
              <span className="card-title-pill">{data?.recentPartners.length || 0}</span>
            </div>
            {data && data.recentPartners.length > 0 ? (
              <div>
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr",
                  gap: 8, padding: "8px 0", borderBottom: "0.5px solid var(--border)",
                  fontSize: 11, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  <span>Name</span>
                  <span style={{ textAlign: "right" }}>Joined</span>
                </div>
                {data.recentPartners.map((p) => (
                  <div key={p.slug} style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr",
                    gap: 8, padding: "10px 0", borderBottom: "0.5px solid var(--border)",
                    fontSize: 13, color: "var(--ink2)",
                  }}>
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
                    <span style={{ textAlign: "right", fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No partners registered yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const adminCss = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.pd{--sf:-apple-system,"SF Pro Display","SF Pro Text",BlinkMacSystemFont,"Helvetica Neue",sans-serif;--green:#10b981;--green-light:#34d399;--green-pale:#d1fae5;--green-bg:#f0fdf4;--ink:#0a0a0a;--ink2:#374151;--ink3:#6b7280;--surface:white;--border:rgba(16,185,129,0.15);font-family:var(--sf);color:var(--ink);background:var(--green-bg);min-height:100vh}
.pd .topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;background:rgba(240,253,244,0.92);backdrop-filter:blur(12px);border-bottom:0.5px solid var(--border);position:sticky;top:0;z-index:50}
.pd .tb-logo{font-weight:700;font-size:16px;letter-spacing:-0.5px}
.pd .tb-logo span{color:var(--green)}
.pd .tb-right{display:flex;align-items:center;gap:10px}
.pd .tb-nav{display:flex;align-items:center;gap:4px;background:var(--green-pale);border-radius:12px;padding:3px}
.pd .tb-nav-link{padding:6px 14px;border-radius:9px;font-size:13px;font-weight:600;color:var(--ink3);text-decoration:none;transition:all .15s}
.pd .tb-nav-link.active{background:white;color:var(--ink);box-shadow:0 1px 4px rgba(0,0,0,0.06)}
.pd .tb-nav-link:hover:not(.active){color:var(--ink)}
.pd .tb-avatar{width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--green-bg);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;letter-spacing:-0.5px}
.pd .inner{padding:28px 24px;max-width:1100px;margin:0 auto}
.pd .greeting{margin-bottom:24px}
.pd .greeting-sub{font-size:13px;color:var(--ink3);margin-bottom:4px}
.pd .greeting-h{font-size:26px;font-weight:700;letter-spacing:-1px;color:var(--ink)}
.pd .greeting-h em{font-style:italic;font-family:'Playfair Display',serif;color:var(--green)}
.pd .metric-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.pd .metric-card{background:var(--surface);border:0.5px solid var(--border);border-radius:20px;padding:18px 16px;position:relative;overflow:hidden}
.pd .metric-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--green),var(--green-light))}
.pd .metric-label{font-size:10px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px}
.pd .metric-val{font-size:24px;font-weight:800;letter-spacing:-1.5px;color:var(--ink);margin-bottom:2px}
.pd .metric-val.green{background:linear-gradient(135deg,var(--green),var(--green-light));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.pd .metric-delta{font-size:11px;font-weight:500;color:#059669;display:flex;align-items:center;gap:4px}
.pd .card{background:var(--surface);border:0.5px solid var(--border);border-radius:20px;padding:22px 20px}
.pd .card-title{font-size:13px;font-weight:600;color:var(--ink);letter-spacing:-0.3px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
.pd .card-title-pill{font-size:11px;font-weight:500;color:var(--green);background:var(--green-pale);padding:3px 10px;border-radius:100px;letter-spacing:0;font-weight:600}
.pd .empty-state{padding:30px 20px;text-align:center;color:var(--ink3);font-size:13px}
`;
