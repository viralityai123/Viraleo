import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getSessionFromDocument, getSessionToken, verifySession, type SessionPayload } from "@/lib/auth/session";
import { createServerFn } from "@tanstack/react-start";
import { getPartnerAnalytics, getOrCreateAlias, getPartnerRef, type PartnerData } from "@/lib/partner-store";
import { setRecipient, getRecipient, type RecipientData } from "@/lib/recipient-store";
import { processPartnerPayout, getUnpaidCommissions as calcUnpaidCommissions } from "@/lib/payout";
import { getPayoutsForPartner, type PayoutRecord } from "@/lib/payout-store";

async function requirePartnerAuth(token: string, slug: string): Promise<boolean> {
  const jwtSecret = process.env.JWT_SECRET || "";
  const session = await verifySession(token, jwtSecret);
  if (!session) return false;
  return getPartnerRef(session.name) === slug;
}

const getServerPartnerData = createServerFn({ method: "POST" })
  .inputValidator((d: { ref: string; token: string }) => d)
  .handler(async ({ data }) => {
    if (!(await requirePartnerAuth(data.token, data.ref))) throw new Error("Unauthorized");
    const analytics = await getPartnerAnalytics(data.ref);
    if (!analytics) return null;
    return analytics;
  });

const getPartnerAlias = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; token: string }) => d)
  .handler(async ({ data }) => {
    if (!(await requirePartnerAuth(data.token, data.slug))) throw new Error("Unauthorized");
    return getOrCreateAlias(data.slug);
  });

const saveRecipient = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; token: string; data: RecipientData }) => d)
  .handler(async ({ data }) => {
    if (!(await requirePartnerAuth(data.token, data.slug))) throw new Error("Unauthorized");
    await setRecipient(data.slug, data.data);
    return { ok: true };
  });

const loadRecipient = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; token: string }) => d)
  .handler(async ({ data }) => {
    if (!(await requirePartnerAuth(data.token, data.slug))) throw new Error("Unauthorized");
    return getRecipient(data.slug);
  });

const requestPayout = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; token: string }) => d)
  .handler(async ({ data }) => {
    if (!(await requirePartnerAuth(data.token, data.slug))) throw new Error("Unauthorized");
    return processPartnerPayout(data.slug);
  });

const loadPayouts = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; token: string }) => d)
  .handler(async ({ data }) => {
    if (!(await requirePartnerAuth(data.token, data.slug))) throw new Error("Unauthorized");
    return getPayoutsForPartner(data.slug);
  });

export const Route = createFileRoute("/partner/dashboard")({
  head: () => ({
    meta: [
      { title: "Partner Dashboard — Viraleo" },
      { name: "description", content: "Your Viraleo partner dashboard. Track referrals, commissions, clicks, and request payouts." },
      { property: "og:title", content: "Partner Dashboard — Viraleo" },
      { name: "twitter:title", content: "Partner Dashboard — Viraleo" },
      { name: "twitter:description", content: "Track referrals and commissions." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/partner/dashboard" }],
  }),
  component: PartnerDashboard,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://viraleo.pro";
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || name.slice(0, 2).toUpperCase();
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

const inputStyle: React.CSSProperties = {
  background: "var(--green-bg)",
  border: "0.5px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  color: "var(--ink)",
  fontFamily: "var(--sf)",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
};

const COUNTRIES: Record<string, { flag: string; name: string; currency: string; type: string }> = {
  india: { flag: "🇮🇳", name: "India", currency: "INR", type: "indian" },
  us: { flag: "🇺🇸", name: "United States", currency: "USD", type: "aba" },
  uk: { flag: "🇬🇧", name: "United Kingdom", currency: "GBP", type: "sort_code" },
  europe: { flag: "🇪🇺", name: "Europe", currency: "EUR", type: "iban" },
  australia: { flag: "🇦🇺", name: "Australia", currency: "AUD", type: "aussie" },
  canada: { flag: "🇨🇦", name: "Canada", currency: "CAD", type: "canadian" },
};

const COUNTRY_FIELDS: Record<string, { key: string; label: string; placeholder: string; validate: (v: string) => string | null }[]> = {
  india: [
    { key: "IFSC", label: "IFSC Code", placeholder: "e.g. HDFC0001234", validate: (v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v) ? null : "IFSC must be 11 chars: 4 letters + 0 + 6 alphanumeric" },
    { key: "accountNumber", label: "Account Number", placeholder: "e.g. 123456789", validate: (v) => /^\d{9,18}$/.test(v) ? null : "Must be 9-18 digits" },
  ],
  us: [
    { key: "routingNumber", label: "Routing Number", placeholder: "e.g. 021000021", validate: (v) => /^\d{9}$/.test(v) ? null : "Routing number must be 9 digits" },
    { key: "accountNumber", label: "Account Number", placeholder: "e.g. 12345678", validate: (v) => /^\d{1,17}$/.test(v) ? null : "Invalid account number" },
  ],
  uk: [
    { key: "sortCode", label: "Sort Code", placeholder: "e.g. 12-34-56", validate: (v) => /^\d{2}-\d{2}-\d{2}$/.test(v) ? null : "Sort code format: 12-34-56" },
    { key: "accountNumber", label: "Account Number", placeholder: "e.g. 12345678", validate: (v) => /^\d{8}$/.test(v) ? null : "UK account must be 8 digits" },
  ],
  europe: [
    { key: "iban", label: "IBAN", placeholder: "e.g. GB33BUKB20201555555555", validate: (v) => /^[A-Za-z]{2}\d{2}[A-Za-z0-9]{1,30}$/.test(v.replace(/\s/g, "")) ? null : "Invalid IBAN format" },
  ],
  australia: [
    { key: "bsbCode", label: "BSB Code", placeholder: "e.g. 123-456", validate: (v) => /^\d{3}-\d{3}$/.test(v) ? null : "BSB format: 123-456" },
    { key: "accountNumber", label: "Account Number", placeholder: "e.g. 123456", validate: (v) => /^\d{1,9}$/.test(v) ? null : "Invalid account number" },
  ],
  canada: [
    { key: "institutionNo", label: "Institution Number", placeholder: "e.g. 001", validate: (v) => /^\d{3}$/.test(v) ? null : "Must be 3 digits" },
    { key: "transitNo", label: "Transit Number", placeholder: "e.g. 12345", validate: (v) => /^\d{5}$/.test(v) ? null : "Must be 5 digits" },
    { key: "accountNumber", label: "Account Number", placeholder: "e.g. 1234567", validate: (v) => /^\d{1,12}$/.test(v) ? null : "Invalid account number" },
  ],
};

function buildDetails(country: string, form: Record<string, string>): Record<string, string> {
  switch (country) {
    case "india": return { IFSC: form.IFSC, accountNumber: form.accountNumber };
    case "us": return { routingNumber: form.routingNumber, accountNumber: form.accountNumber };
    case "uk": return { sortCode: form.sortCode, accountNumber: form.accountNumber };
    case "europe": return { iban: form.iban.replace(/\s/g, "") };
    case "australia": return { bsbCode: form.bsbCode, accountNumber: form.accountNumber };
    case "canada": return { institutionNo: form.institutionNo, transitNo: form.transitNo, accountNumber: form.accountNumber };
    default: return {};
  }
}

function formatRecipientSummary(r: RecipientData): string {
  if (r.details.IFSC) return `IFSC: ${r.details.IFSC}`;
  if (r.details.routingNumber) return `Routing: ${r.details.routingNumber}`;
  if (r.details.sortCode) return `Sort: ${r.details.sortCode}`;
  if (r.details.iban) return `IBAN: ${r.details.iban.slice(0, 4)}...${r.details.iban.slice(-4)}`;
  if (r.details.bsbCode) return `BSB: ${r.details.bsbCode}`;
  if (r.details.institutionNo) return `Inst: ${r.details.institutionNo} Transit: ${r.details.transitNo}`;
  return "";
}

function getCountryByType(type: string): string {
  return Object.entries(COUNTRIES).find(([, c]) => c.type === type)?.[0] || "india";
}

function buildMonthlyHistory(analytics: PartnerData): { month: string; earnings: number }[] {
  const monthMap = new Map<string, number>();
  for (const c of analytics.commissions) {
    const d = new Date(c.timestamp);
    const key = `${MONTHS[d.getMonth()]}`;
    monthMap.set(key, (monthMap.get(key) || 0) + c.amount);
  }
  const last6 = MONTHS.map((m, i) => {
    const now = new Date();
    const idx = (now.getMonth() - 5 + i + 12) % 12;
    return MONTHS[idx];
  });
  return last6.map((m) => ({ month: m, earnings: monthMap.get(m) || 0 }));
}

function getTopReferrals(analytics: PartnerData, limit = 5) {
  const sorted = [...analytics.commissions].sort((a, b) => b.timestamp - a.timestamp);
  return sorted.slice(0, limit).map((c) => ({
    email: c.userEmail,
    tier: c.tier,
    amount: c.amount,
    date: new Date(c.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));
}

function computeConversionRate(analytics: PartnerData): { rate: number; trials: number; converts: number } {
  const trialCount = analytics.totalSignups;
  const convertCount = analytics.totalCommissions;
  return {
    rate: trialCount > 0 ? Math.round((convertCount / trialCount) * 100) : 0,
    trials: trialCount,
    converts: convertCount,
  };
}

function PartnerDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [analytics, setAnalytics] = useState<PartnerData | null>(null);
  const [accessOk, setAccessOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alias, setAlias] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [recipient, setRecipientState] = useState<RecipientData | null>(null);
  const [bankForm, setBankForm] = useState({
    accountHolderName: "",
    country: "india",
    IFSC: "",
    accountNumber: "",
    routingNumber: "",
    sortCode: "",
    iban: "",
    bsbCode: "",
    institutionNo: "",
    transitNo: "",
  });
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    const isPartner = localStorage.getItem("viraleo:partner") === "true";
    if (!isPartner) {
      navigate({ to: "/" });
      return;
    }
    setAccessOk(true);

    const s = getSessionFromDocument();
    setSession(s);
    const token = getSessionToken() || "";
    const refSlug = getPartnerRef(s?.name || "Creator");

    Promise.all([
      getServerPartnerData({ data: { ref: refSlug, token } }),
      getPartnerAlias({ data: { slug: refSlug, token } }),
      loadRecipient({ data: { slug: refSlug, token } }),
      loadPayouts({ data: { slug: refSlug, token } }),
    ]).then(([serverData, alias, recipientData, payoutsData]) => {
      if (serverData) setAnalytics(serverData);
      setAlias(alias);
      if (recipientData) {
        setRecipientState(recipientData);
        const country = getCountryByType(recipientData.type);
        setBankForm({
          accountHolderName: recipientData.accountHolderName,
          country,
          IFSC: recipientData.details.IFSC || "",
          accountNumber: recipientData.details.accountNumber || "",
          routingNumber: recipientData.details.routingNumber || "",
          sortCode: recipientData.details.sortCode || "",
          iban: recipientData.details.iban || "",
          bsbCode: recipientData.details.bsbCode || "",
          institutionNo: recipientData.details.institutionNo || "",
          transitNo: recipientData.details.transitNo || "",
        });
      }
      setPayouts(payoutsData);
      setLoading(false);
    });
  }, []);

  const origin = getOrigin();
  const name = session?.name || "Creator";
  const initials = getInitials(name);
  const refSlug = getPartnerRef(name);

  const monthlyHistory = analytics ? buildMonthlyHistory(analytics) : [];
  const thisMonth = monthlyHistory[monthlyHistory.length - 1]?.earnings || 0;
  const prevMonth = monthlyHistory.length >= 2 ? monthlyHistory[monthlyHistory.length - 2]?.earnings || 0 : 0;
  const deltaPct = prevMonth > 0 ? Math.round(((thisMonth - prevMonth) / prevMonth) * 100) : 0;

  const totalEarned = analytics?.totalEarned || 0;
  const totalClicks = analytics?.totalClicks || 0;
  const totalCommissions = analytics?.totalCommissions || 0;
  const totalSignups = analytics?.totalSignups || 0;
  const { rate: convRate, trials, converts } = analytics ? computeConversionRate(analytics) : { rate: 0, trials: 0, converts: 0 };
  const topRefs = analytics ? getTopReferrals(analytics) : [];

  const nextPayout = new Date();
  nextPayout.setDate(1);
  nextPayout.setMonth(nextPayout.getMonth() + 1);
  const payoutStr = nextPayout.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const daysAway = Math.ceil((nextPayout.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const pctCycle = Math.round((now.getDate() / daysInMonth) * 100);

  const unpaidCommissions = analytics ? calcUnpaidCommissions(analytics) : [];
  const pendingPayout = unpaidCommissions.reduce((sum, c) => sum + c.amount, 0);

  async function handleSaveBank() {
    const countryInfo = COUNTRIES[bankForm.country];
    const fields = COUNTRY_FIELDS[bankForm.country];
    for (const f of fields) {
      const val = bankForm[f.key as keyof typeof bankForm] as string;
      const err = f.validate(val);
      if (err) {
        setPayoutMsg(err);
        setTimeout(() => setPayoutMsg(""), 4000);
        return;
      }
    }
    setSavingBank(true);
    const s = getSessionFromDocument();
    const token = getSessionToken() || "";
    const slug = getPartnerRef(s?.name || "Creator");
    const data: RecipientData = {
      accountHolderName: bankForm.accountHolderName,
      currency: countryInfo.currency,
      type: countryInfo.type,
      details: buildDetails(bankForm.country, bankForm),
      createdAt: Date.now(),
    };
    const res = await saveRecipient({ data: { slug, token, data } });
    if (res.ok) {
      setRecipientState(data);
      setPayoutMsg("Bank details saved");
      setTimeout(() => setPayoutMsg(""), 3000);
    }
    setSavingBank(false);
  }

  async function handleRequestPayout() {
    const s = getSessionFromDocument();
    const token = getSessionToken() || "";
    const slug = getPartnerRef(s?.name || "Creator");
    setPayoutLoading(true);
    setPayoutMsg("");
    const res = await requestPayout({ data: { slug, token } });
    if (res.success) {
      setPayoutMsg("Payout initiated successfully!");
      const fresh = await getServerPartnerData({ data: { ref: slug, token } });
      if (fresh) setAnalytics(fresh);
      const freshPayouts = await loadPayouts({ data: { slug, token } });
      setPayouts(freshPayouts);
    } else {
      setPayoutMsg(`Payout failed: ${res.error}`);
    }
    setPayoutLoading(false);
    setTimeout(() => setPayoutMsg(""), 5000);
  }

  if (!accessOk) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .pd{--sf:-apple-system,"SF Pro Display","SF Pro Text",BlinkMacSystemFont,"Helvetica Neue",sans-serif;--green:#10b981;--green-light:#34d399;--green-pale:#d1fae5;--green-bg:#f0fdf4;--ink:#0a0a0a;--ink2:#374151;--ink3:#6b7280;--surface:white;--border:rgba(16,185,129,0.15);font-family:var(--sf);color:var(--ink);background:var(--green-bg);min-height:100vh}
        .pd .topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;background:rgba(240,253,244,0.92);backdrop-filter:blur(12px);border-bottom:0.5px solid var(--border);position:sticky;top:0;z-index:50}
        .pd .tb-logo{font-weight:700;font-size:16px;letter-spacing:-0.5px}
        .pd .tb-logo span{color:var(--green)}
        .pd .tb-right{display:flex;align-items:center;gap:10px}
        .pd .tb-badge{background:var(--green-pale);color:#059669;font-size:12px;font-weight:600;padding:5px 12px;border-radius:100px;border:0.5px solid rgba(16,185,129,0.3)}
        .pd .tb-avatar{width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--green-bg);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;letter-spacing:-0.5px}
        .pd .inner{padding:28px 24px;max-width:720px;margin:0 auto}
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
        .pd .metric-delta.neg{color:#ef4444}
        .pd .wide-row{display:grid;grid-template-columns:1.4fr 1fr;gap:12px;margin-bottom:20px}
        .pd .card{background:var(--surface);border:0.5px solid var(--border);border-radius:20px;padding:22px 20px}
        .pd .card-title{font-size:13px;font-weight:600;color:var(--ink);letter-spacing:-0.3px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
        .pd .card-title-pill{font-size:11px;font-weight:500;color:var(--green);background:var(--green-pale);padding:3px 10px;border-radius:100px;letter-spacing:0;font-weight:600}
        .pd .chart-wrap{position:relative;width:100%;height:160px}
        .pd .bottom-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
        .pd .link-box{background:var(--surface);border:0.5px solid var(--border);border-radius:20px;padding:20px}
        .pd .link-label{font-size:11px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px}
        .pd .link-input-wrap{display:flex;gap:8px;align-items:center}
        .pd .link-url{flex:1;background:var(--green-bg);border:0.5px solid var(--border);border-radius:10px;padding:9px 12px;font-size:12px;color:var(--ink2);font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pd .copy-btn{background:var(--ink);color:var(--green-bg);border:none;border-radius:10px;padding:9px 14px;font-size:12px;font-weight:600;cursor:pointer;transition:opacity .2s;white-space:nowrap}
        .pd .copy-btn:hover{opacity:.85}
        .pd .copy-btn.copied{background:var(--green)}
        .pd .payout-box{background:var(--surface);border:0.5px solid var(--border);border-radius:20px;padding:20px}
        .pd .payout-label{font-size:11px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px}
        .pd .payout-amount{font-size:32px;font-weight:800;letter-spacing:-2px;background:linear-gradient(135deg,var(--green),var(--green-light));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:4px}
        .pd .payout-sub{font-size:12px;color:var(--ink3);margin-bottom:14px}
        .pd .payout-bar-wrap{background:#e5e7eb;border-radius:100px;height:5px;margin-bottom:6px}
        .pd .payout-bar{height:5px;border-radius:100px;background:linear-gradient(90deg,var(--green),var(--green-light));width:73%}
        .pd .payout-dates{display:flex;justify-content:space-between;font-size:11px;color:var(--ink3)}
        .pd .status-bar{background:var(--ink);border-radius:16px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}
        .pd .status-left{font-size:13px;color:#9ca3af}
        .pd .status-left strong{color:white;font-weight:600}
        .pd .status-pill{background:var(--green);color:white;font-size:12px;font-weight:700;padding:6px 14px;border-radius:100px}
        .pd .ref-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid var(--border)}
        .pd .ref-row:last-child{border-bottom:none}
        .pd .ref-left{display:flex;align-items:center;gap:10px}
        .pd .ref-avatar{width:28px;height:28px;border-radius:50%;background:var(--green-pale);color:#059669;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
        .pd .ref-info{font-size:13px;font-weight:600;color:var(--ink)}
        .pd .ref-sub{font-size:11px;color:var(--ink3)}
        .pd .ref-amount{font-size:14px;font-weight:700;color:var(--green)}
        .pd .perf-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
        .pd .perf-item{background:var(--green-bg);border-radius:12px;padding:14px;text-align:center}
        .pd .perf-num{font-size:20px;font-weight:800;color:var(--ink);letter-spacing:-1px}
        .pd .perf-label{font-size:10px;color:var(--ink3);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}
        .pd .empty-state{padding:30px 20px;text-align:center;color:var(--ink3);font-size:13px}
        .pd .country-select-wrap{position:relative}
        .pd .country-select-wrap::after{content:'\u25BC';font-size:10px;color:#6b7280;position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none}
      `}</style>
      <div className="pd">
        <div className="topbar">
          <div className="tb-logo"><span>Viraleo</span> Partners</div>
          <div className="tb-right">
            <div className="tb-badge">✦ Verified Partner</div>
            <div className="tb-avatar">{initials}</div>
          </div>
        </div>

        <div className="inner">
          <div className="greeting">
            <div className="greeting-sub">Welcome back, {name.split(" ")[0]} —</div>
            <div className="greeting-h">Your <em>partner</em> dashboard</div>
          </div>

          <div className="status-bar">
            <div className="status-left">Next payout on <strong>{payoutStr}</strong> · {daysAway} day{daysAway !== 1 ? "s" : ""} away</div>
            <div className="status-pill">Active partner</div>
          </div>

          {loading ? (
            <div className="empty-state">Loading your analytics...</div>
          ) : analytics && totalCommissions > 0 ? (
            <>
              <div className="metric-row">
                <div className="metric-card">
                  <div className="metric-label">This month</div>
                  <div className="metric-val green">{fmt(thisMonth)}</div>
                  <div className="metric-delta">{deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}% vs last month</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Total earned</div>
                  <div className="metric-val">{fmt(totalEarned)}</div>
                  <div className="metric-delta">↑ All time</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Referrals</div>
                  <div className="metric-val">{totalCommissions}</div>
                  <div className="metric-delta">↑ Paid conversions</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Clicks</div>
                  <div className="metric-val">{totalClicks}</div>
                  <div className="metric-delta">{totalClicks > 0 ? `${convRate}% conv rate` : "No data"}</div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">Your invite link</div>
                <div className="link-input-wrap">
                  <div className="link-url">{origin.replace(/^https?:\/\//, "")}/ref/{alias}</div>
                  <button
                    className={`copy-btn${copiedLink ? " copied" : ""}`}
                    onClick={() => {
                      navigator.clipboard?.writeText(`${origin}/ref/${alias}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                  >{copiedLink ? "Copied!" : "Copy"}</button>
                </div>
              </div>

              <div className="wide-row">
                <div className="card">
                  <div className="card-title">Monthly earnings <span className="card-title-pill">Last 6 months</span></div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyHistory} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                        <Tooltip formatter={(v: number) => [`$${Math.round(v).toLocaleString()}`, "Earnings"]} cursor={{ fill: "rgba(16,185,129,0.08)" }} />
                        <Bar dataKey="earnings" radius={[8, 8, 0, 0]} fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth={1.5} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">Top referrals</div>
                  {topRefs.length > 0 ? (
                    topRefs.map((r, i) => (
                      <div className="ref-row" key={i}>
                        <div className="ref-left">
                          <div className="ref-avatar">{r.email[0]?.toUpperCase() || "?"}</div>
                          <div>
                            <div className="ref-info">{r.email}</div>
                            <div className="ref-sub">{r.tier} plan · {r.date}</div>
                          </div>
                        </div>
                        <div className="ref-amount">+{fmt(r.amount)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No conversions yet</div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-title">Link performance</div>
                <div className="perf-grid">
                  <div className="perf-item">
                    <div className="perf-num">{totalClicks > 0 ? (totalClicks / 1000).toFixed(1) + "k" : "0"}</div>
                    <div className="perf-label">Clicks</div>
                  </div>
                  <div className="perf-item">
                    <div className="perf-num">{trials}</div>
                    <div className="perf-label">Signups</div>
                  </div>
                  <div className="perf-item">
                    <div className="perf-num">{converts}</div>
                    <div className="perf-label">Conversions</div>
                  </div>
                  <div className="perf-item">
                    <div className="perf-num">{convRate}%</div>
                    <div className="perf-label">Conv. rate</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>No activity yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                Commissions will appear here when someone uses your invite link and purchases a paid plan.
              </div>

              <div className="card" style={{ marginTop: 24, textAlign: "left" }}>
                <div className="link-label" style={{ marginBottom: 6 }}>Your invite link</div>
                <div className="link-input-wrap">
                  <div className="link-url">{origin.replace(/^https?:\/\//, "")}/ref/{alias}</div>
                  <button
                    className={`copy-btn${copiedLink ? " copied" : ""}`}
                    onClick={() => {
                      navigator.clipboard?.writeText(`${origin}/ref/${alias}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                  >{copiedLink ? "Copied!" : "Copy"}</button>
                </div>
              </div>
            </div>
          )}

          {payoutMsg && (
            <div style={{ background: payoutMsg.startsWith("Payout initiated") ? "var(--green-pale)" : payoutMsg.startsWith("Payout failed") ? "#fee2e2" : "var(--green-pale)", color: payoutMsg.startsWith("Payout failed") ? "#dc2626" : "#059669", padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 16, textAlign: "center" }}>
              {payoutMsg}
            </div>
          )}

          <div className="wide-row">
            <div className="link-box">
              <div className="link-label">Pending payout</div>
              <div className="payout-amount">{fmt(pendingPayout)}</div>
              <div className="payout-sub">
                {recipient
                  ? `${unpaidCommissions.length} unpaid commission${unpaidCommissions.length !== 1 ? "s" : ""}`
                  : "Set up bank details to receive payouts"}
              </div>
              <button
                onClick={handleRequestPayout}
                disabled={payoutLoading || !recipient || pendingPayout === 0}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: "10px 0",
                  background: payoutLoading || !recipient || pendingPayout === 0 ? "#d1d5db" : "var(--ink)",
                  color: payoutLoading || !recipient || pendingPayout === 0 ? "#9ca3af" : "var(--green-bg)",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: payoutLoading || !recipient || pendingPayout === 0 ? "not-allowed" : "pointer",
                  opacity: 1,
                }}
              >{payoutLoading ? "Processing..." : pendingPayout > 0 && recipient ? "Request payout" : "Nothing to pay"}</button>
            </div>
            <div className="payout-box">
              <div className="link-label">How it works</div>
              <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.6, padding: "8px 0" }}>
                Share your referral link with creators. When they sign up and purchase a paid plan, you earn a commission:
                <ul style={{ marginTop: 8, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  <li><strong>Creator plan</strong> — $10/referral</li>
                  <li><strong>Pro plan</strong> — $25/referral</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">
              Payout settings
              <span className="card-title-pill">{recipient ? "Connected" : "Not set up"}</span>
            </div>
            {recipient ? (
              <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{COUNTRIES[getCountryByType(recipient.type)]?.flag || "🏦"}</span>
                  <strong>{bankForm.accountHolderName}</strong>
                  <span style={{ fontSize: 12, color: "var(--ink3)" }}>({recipient.currency})</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--ink3)" }}>
                  {formatRecipientSummary(recipient)}
                  {recipient.details.accountNumber ? ` · Account: ${recipient.details.accountNumber.slice(-4).padStart(recipient.details.accountNumber.length, "•")}` : ""}
                </span>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    placeholder="Account holder name"
                    value={bankForm.accountHolderName}
                    onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                    style={inputStyle}
                  />
                  <div className="country-select-wrap">
                    <select
                      value={bankForm.country}
                      onChange={(e) => setBankForm({ ...bankForm, country: e.target.value })}
                      style={{ ...selectStyle, paddingRight: 32, width: "100%" }}
                    >
                      {Object.entries(COUNTRIES).map(([key, c]) => (
                        <option key={key} value={key}>{c.flag} {c.name} ({c.currency})</option>
                      ))}
                    </select>
                  </div>
                  {COUNTRY_FIELDS[bankForm.country].map((f) => (
                    <input
                      key={f.key}
                      placeholder={f.placeholder}
                      value={bankForm[f.key as keyof typeof bankForm] as string}
                      onChange={(e) => {
                        const val = f.key === "IFSC" || f.key === "sortCode" || f.key === "bsbCode" ? e.target.value.toUpperCase() : e.target.value;
                        setBankForm({ ...bankForm, [f.key]: val });
                      }}
                      style={inputStyle}
                    />
                  ))}
                  <button
                    onClick={handleSaveBank}
                    disabled={savingBank || !bankForm.accountHolderName}
                    style={{
                      padding: "10px 0",
                      background: bankForm.accountHolderName ? "var(--ink)" : "#d1d5db",
                      color: bankForm.accountHolderName ? "var(--green-bg)" : "#9ca3af",
                      border: "none",
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: savingBank ? "not-allowed" : "pointer",
                    }}
                  >{savingBank ? "Saving..." : "Save bank details"}</button>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">
              Payout history
              <span className="card-title-pill">{payouts.length}</span>
            </div>
            {payouts.length > 0 ? (
              <div>
                {payouts.map((p) => (
                  <div className="ref-row" key={p.id}>
                    <div className="ref-left">
                      <div>
                        <div className="ref-info">{fmt(p.amount)}</div>
                        <div className="ref-sub">{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 100,
                      background: p.status === "completed" ? "var(--green-pale)" : p.status === "failed" ? "#fee2e2" : "#f3f4f6",
                      color: p.status === "completed" ? "#059669" : p.status === "failed" ? "#dc2626" : "#6b7280",
                    }}>
                      {p.status === "completed" ? "Paid" : p.status === "processing" ? "Processing" : p.status === "pending" ? "Pending" : "Failed"}
                    </div>
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
