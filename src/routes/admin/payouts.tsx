import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getSessionFromDocument, getSessionToken, verifySession, type SessionPayload } from "@/lib/auth/session";
import { getAllPartnersSlugs, getPartnerAnalytics } from "@/lib/partner-store";
import { getPendingPayout } from "@/lib/payout";
import { processAllPartnerPayouts as runAllPayouts } from "@/lib/payout";
import { getRecipient } from "@/lib/recipient-store";
import { getAllPayouts, type PayoutRecord } from "@/lib/payout-store";

interface PartnerSummary {
  slug: string;
  name: string;
  totalCommissions: number;
  totalEarned: number;
  pendingPayout: number;
  unpaidCount: number;
  hasBankDetails: boolean;
}

interface AdminData {
  partners: PartnerSummary[];
  totalPending: number;
  totalAllTime: number;
}

const getAdminEmail = createServerFn({ method: "GET" }).handler(async () => {
  return process.env.ADMIN_EMAIL || "";
});

const getAdminPayoutData = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const adminEmail = process.env.ADMIN_EMAIL || "";
    const jwtSecret = process.env.JWT_SECRET || "";
    const session = await verifySession(data.token, jwtSecret);
    if (!session || session.email !== adminEmail) {
      throw new Error("Unauthorized");
    }
    const slugs = await getAllPartnersSlugs();
    const partners: PartnerSummary[] = [];
    let totalPending = 0;
    let totalAllTime = 0;

    for (const slug of slugs) {
      const partnerData = await getPartnerAnalytics(slug);
      if (!partnerData) continue;
      const recipient = await getRecipient(slug);
      const unpaid = partnerData.commissions.filter((c) => !c.paid);
      const pending = unpaid.reduce((s, c) => s + c.amount, 0);
      totalPending += pending;
      totalAllTime += partnerData.totalEarned;
      partners.push({
        slug,
        name: partnerData.name,
        totalCommissions: partnerData.totalCommissions,
        totalEarned: partnerData.totalEarned,
        pendingPayout: pending,
        unpaidCount: unpaid.length,
        hasBankDetails: !!recipient,
      });
    }

    partners.sort((a, b) => b.pendingPayout - a.pendingPayout);
    return { partners, totalPending, totalAllTime } satisfies AdminData;
  });

const processAllPayouts = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const adminEmail = process.env.ADMIN_EMAIL || "";
    const jwtSecret = process.env.JWT_SECRET || "";
    const session = await verifySession(data.token, jwtSecret);
    if (!session || session.email !== adminEmail) {
      throw new Error("Unauthorized");
    }
    const results = await runAllPayouts();
    return results;
  });

const getHistory = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const adminEmail = process.env.ADMIN_EMAIL || "";
    const jwtSecret = process.env.JWT_SECRET || "";
    const session = await verifySession(data.token, jwtSecret);
    if (!session || session.email !== adminEmail) {
      throw new Error("Unauthorized");
    }
    return getAllPayouts();
  });

const getWiseStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const adminEmail = process.env.ADMIN_EMAIL || "";
    const jwtSecret = process.env.JWT_SECRET || "";
    const session = await verifySession(data.token, jwtSecret);
    if (!session || session.email !== adminEmail) {
      throw new Error("Unauthorized");
    }
    return !!process.env.WISE_API_KEY;
  });

export const Route = createFileRoute("/admin/payouts")({
  head: () => ({
    meta: [
      { title: "Admin Payouts — Viraleo" },
      { name: "description", content: "Admin dashboard for managing partner payouts via Wise API." },
      { property: "og:title", content: "Admin Payouts — Viraleo" },
      { property: "og:description", content: "Manage partner payouts." },
      { name: "twitter:title", content: "Admin Payouts — Viraleo" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/admin/payouts" }],
  }),
  component: AdminPayoutsPage,
});

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || name.slice(0, 2).toUpperCase();
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

function AdminPayoutsPage() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [history, setHistory] = useState<PayoutRecord[]>([]);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [wiseOk, setWiseOk] = useState(false);

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
      Promise.all([
        getAdminPayoutData({ data: { token } }),
        getHistory({ data: { token } }),
        getWiseStatus({ data: { token } }),
      ]).then(([d, h, w]) => {
        setData(d);
        setHistory(h);
        setWiseOk(w);
        setLoading(false);
      });
    });
  }, []);

  async function handlePayAll() {
    const token = getSessionToken() || "";
    setProcessing(true);
    setMsg("");
    const results = await processAllPayouts({ data: { token } });
    const successCount = results.filter((r) => r.result.success).length;
    const failCount = results.filter((r) => !r.result.success).length;
    const errors = results.filter((r) => !r.result.success).map((r) => `${r.slug}: ${r.result.error}`).join("; ");
    setMsg(`Paid: ${successCount}, Failed: ${failCount}${failCount > 0 ? ` — ${errors}` : ""}`);
    const [d, h] = await Promise.all([getAdminPayoutData({ data: { token } }), getHistory({ data: { token } })]);
    setData(d);
    setHistory(h);
    setProcessing(false);
    setTimeout(() => setMsg(""), 6000);
  }

  if (loading) {
    return (
      <>
        <style>{adminCss}</style>
        <div className="pd"><div className="inner"><div className="empty-state">Loading...</div></div></div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <style>{adminCss}</style>
        <div className="pd"><div className="inner">
          <div className="empty-state" style={{ padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Access denied</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>You don't have permission to view this page.</div>
          </div>
        </div></div>
      </>
    );
  }

  const name = session?.name || "Admin";
  const initials = getInitials(name);

  return (
    <>
      <style>{adminCss}</style>
      <div className="pd">
        <div className="topbar">
          <div className="tb-logo"><span>Viraleo</span> Admin</div>
          <div className="tb-right">
          <div className="tb-nav">
            <Link to="/admin/dashboard" className="tb-nav-link">Dashboard</Link>
            <Link to="/admin/payouts" className="tb-nav-link active">Payouts</Link>
          </div>
          <div className="tb-avatar">{initials}</div>
          </div>
        </div>

        <div className="inner">
          <div className="greeting">
            <div className="greeting-sub">Welcome back, {name.split(" ")[0]} —</div>
            <div className="greeting-h">Payout <em>dashboard</em></div>
          </div>

          {msg && (
            <div style={{
              background: msg.startsWith("Paid:") ? "var(--green-pale)" : "#fee2e2",
              color: msg.startsWith("Paid:") ? "#059669" : "#dc2626",
              padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 16, textAlign: "center",
            }}>
              {msg}
            </div>
          )}

          <div className="metric-row">
            <div className="metric-card">
              <div className="metric-label">Total pending</div>
              <div className="metric-val green">{fmt(data?.totalPending || 0)}</div>
              <div className="metric-delta">↑ Across all partners</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total paid out</div>
              <div className="metric-val">{fmt(data?.totalAllTime || 0)}</div>
              <div className="metric-delta">↑ All time</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Active partners</div>
              <div className="metric-val">{data?.partners.length || 0}</div>
              <div className="metric-delta">↑ Registered</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Wise</div>
              <div className="metric-val" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0 }}>API ready</div>
              <div className="metric-delta">{wiseOk ? "Configured" : "Not set"}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Bulk payout</div>
              <button
                onClick={handlePayAll}
                disabled={processing || !data || data.totalPending === 0}
                style={{
                  padding: "10px 24px",
                  background: processing || !data || data.totalPending === 0 ? "#d1d5db" : "var(--ink)",
                  color: processing || !data || data.totalPending === 0 ? "#9ca3af" : "var(--green-bg)",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: processing || !data || data.totalPending === 0 ? "not-allowed" : "pointer",
                }}
              >{processing ? "Processing..." : data && data.totalPending > 0 ? `Pay all — ${fmt(data.totalPending)}` : "Nothing to pay"}</button>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">
              Partner payouts
              <span className="card-title-pill">{data?.partners.length || 0} partners</span>
            </div>
            {data && data.partners.length > 0 ? (
              <div>
                {/* Table header */}
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                  gap: 8, padding: "8px 0", borderBottom: "0.5px solid var(--border)",
                  fontSize: 11, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  <span>Partner</span>
                  <span style={{ textAlign: "right" }}>Commissions</span>
                  <span style={{ textAlign: "right" }}>Total earned</span>
                  <span style={{ textAlign: "right" }}>Pending</span>
                  <span style={{ textAlign: "center" }}>Bank</span>
                </div>
                {data.partners.map((p) => (
                  <div key={p.slug} style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                    gap: 8, padding: "12px 0", borderBottom: "0.5px solid var(--border)",
                    fontSize: 13, color: "var(--ink2)",
                  }}>
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
                    <span style={{ textAlign: "right" }}>{p.totalCommissions}</span>
                    <span style={{ textAlign: "right", fontWeight: 600 }}>{fmt(p.totalEarned)}</span>
                    <span style={{
                      textAlign: "right", fontWeight: 700,
                      color: p.pendingPayout > 0 ? "var(--green)" : "var(--ink3)",
                    }}>
                      {fmt(p.pendingPayout)}
                    </span>
                    <span style={{
                      textAlign: "center", fontSize: 11, fontWeight: 600,
                      color: p.hasBankDetails ? "#059669" : "#9ca3af",
                    }}>
                      {p.hasBankDetails ? "✅" : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No partners registered yet</div>
            )}
          </div>

          <div className="card">
            <div className="card-title">
              Payout history
              <span className="card-title-pill">{history.length}</span>
            </div>
            {history.length > 0 ? (
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
                {history.slice(0, 50).map((p) => (
                  <div key={p.id} style={{
                    display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
                    gap: 8, padding: "10px 0", borderBottom: "0.5px solid var(--border)",
                    fontSize: 13, color: "var(--ink2)",
                  }}>
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.partnerSlug}</span>
                    <span style={{ textAlign: "right", fontWeight: 700 }}>{fmt(p.amount)}</span>
                    <span style={{ textAlign: "right", fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <span style={{
                      textAlign: "center", fontSize: 11, fontWeight: 700, padding: "2px 0",
                      color: p.status === "completed" ? "#059669" : p.status === "failed" ? "#dc2626" : "#6b7280",
                    }}>
                      {p.status === "completed" ? "Paid" : p.status === "processing" ? "Processing" : p.status === "pending" ? "Pending" : "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No payouts yet</div>
            )}
          </div>
        </div>
      </div>
    </>
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
.pd .inner{padding:28px 24px;max-width:900px;margin:0 auto}
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
