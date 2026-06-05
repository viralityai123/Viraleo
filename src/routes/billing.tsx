import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getSessionFromDocument } from "@/lib/auth/session";
import { getPlanInfo } from "@/lib/credits";
import { ArrowLeft, CreditCard, CheckCircle, XCircle, Clock, ExternalLink, Loader2 } from "lucide-react";

interface SubscriptionInfo {
  id: string;
  status: string;
  productName: string;
  variantName: string;
  renewsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  cancelled: boolean;
  urls: { customerPortal: string };
}

const fetchSubscription = createServerFn({ method: "POST" })
  .handler(async () => {
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!storeId || !apiKey) return null;

    try {
      const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions?filter[store_id]=${storeId}&page[size]=10`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      });
      if (!res.ok) return null;
      const body = await res.json();
      return (body.data || []) as any[];
    } catch { return null; }
  });

const cancelSubscriptionFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) return { ok: false };
    try {
      const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${data.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ data: { type: "subscriptions", id: data.id, attributes: { cancelled: true } } }),
      });
      return { ok: res.ok };
    } catch { return { ok: false }; }
  });

const resumeSubscriptionFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) return { ok: false };
    try {
      const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${data.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ data: { type: "subscriptions", id: data.id, attributes: { cancelled: false } } }),
      });
      return { ok: res.ok };
    } catch { return { ok: false }; }
  });

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Viraleo" },
      { name: "description", content: "Manage your Viraleo subscription, view invoices, and update billing information." },
      { property: "og:title", content: "Billing — Viraleo" },
      { property: "og:description", content: "Manage your Viraleo subscription." },
      { name: "twitter:title", content: "Billing — Viraleo" },
      { name: "twitter:description", content: "Manage your subscription." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/billing" }],
  }),
  component: BillingPage,
});

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-amber-100 text-amber-700",
    past_due: "bg-red-100 text-red-700",
    expired: "bg-ink-soft/10 text-ink-soft",
    paused: "bg-blue-100 text-blue-700",
  };
  const icons: Record<string, typeof CheckCircle> = {
    active: CheckCircle,
    cancelled: XCircle,
    past_due: XCircle,
    expired: XCircle,
    paused: Clock,
  };
  const Icon = icons[status] || CheckCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${colors[status] || "bg-ink-soft/10 text-ink-soft"}`}>
      <Icon size={12} /> {status}
    </span>
  );
}

function BillingPage() {
  const [subs, setSubs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const planInfo = getPlanInfo();
  const session = getSessionFromDocument();
  const userEmail = session?.email || "";

  useEffect(() => {
    fetchSubscription().then((data) => {
      setSubs(data);
      setLoading(false);
    }).catch(() => { setLoading(false); setError("Failed to load"); });
  }, []);

  const userSub = subs?.find((s: any) => s.attributes.user_email === userEmail);
  const attrs = userSub?.attributes as SubscriptionInfo | undefined;

  async function handleCancel(id: string) {
    setLoading(true);
    const result = await cancelSubscriptionFn({ data: { id } });
    if (result.ok) { setSubs(null); fetchSubscription().then(setSubs); }
    setLoading(false);
  }

  async function handleResume(id: string) {
    setLoading(true);
    const result = await resumeSubscriptionFn({ data: { id } });
    if (result.ok) { setSubs(null); fetchSubscription().then(setSubs); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white text-ink font-text">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/account" className="p-2 rounded-xl hover:bg-surface-2 transition"><ArrowLeft size={18} className="text-ink-soft" /></Link>
          <div>
            <h1 className="font-display text-[26px] font-black text-ink">Billing</h1>
            <p className="text-[13px] text-ink-soft mt-0.5">Manage your subscription and invoices</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          </div>
        )}

        {error && <p className="text-[13px] text-red-600 text-center py-8">{error}</p>}

        {!loading && !error && (
          <div className="space-y-6">
            {/* Current plan */}
            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Current Plan</span>
                <span className="text-[13px] font-bold text-emerald-700">{planInfo.label}</span>
              </div>
              <p className="text-[13px] text-ink-soft">{planInfo.price}</p>
              {attrs && <StatusBadge status={attrs.status} />}
            </div>

            {/* Subscription details */}
            {attrs && (
              <div className="bg-white border border-hairline rounded-2xl p-6 space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Subscription Details</h3>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div><span className="text-ink-soft block">Plan</span><span className="font-semibold text-ink">{attrs.productName} — {attrs.variantName}</span></div>
                  <div><span className="text-ink-soft block">Status</span><StatusBadge status={attrs.status} /></div>
                  {attrs.renewsAt && <div><span className="text-ink-soft block">Renews</span><span className="font-semibold text-ink">{new Date(attrs.renewsAt).toLocaleDateString()}</span></div>}
                  {attrs.endsAt && <div><span className="text-ink-soft block">Ends</span><span className="font-semibold text-ink">{new Date(attrs.endsAt).toLocaleDateString()}</span></div>}
                  <div><span className="text-ink-soft block">Created</span><span className="font-semibold text-ink">{new Date(attrs.createdAt).toLocaleDateString()}</span></div>
                </div>

                {attrs.cancelled ? (
                  <button onClick={() => handleResume(attrs.id)} disabled={loading}
                    className="rounded-xl bg-emerald-500 text-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-600 transition disabled:opacity-50 w-full">
                    Resume subscription
                  </button>
                ) : (
                  <button onClick={() => handleCancel(attrs.id)} disabled={loading}
                    className="rounded-xl border border-red-200 text-red-600 px-5 py-2.5 text-sm font-bold hover:bg-red-50 transition disabled:opacity-50 w-full">
                    Cancel subscription
                  </button>
                )}

                <a href={attrs.urls.customerPortal} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-hairline text-ink px-5 py-2.5 text-sm font-bold hover:bg-surface-2 transition w-full">
                  <ExternalLink size={14} /> Customer Portal <ExternalLink size={12} className="text-ink-soft" />
                </a>
              </div>
            )}

            {/* No subscription */}
            {!attrs && !loading && (
              <div className="bg-white border border-hairline rounded-2xl p-8 text-center">
                <CreditCard size={32} className="mx-auto text-ink-soft/40 mb-3" />
                <h3 className="text-[16px] font-bold text-ink mb-1">No active subscription</h3>
                <p className="text-[13px] text-ink-soft mb-4">You're currently on the Free plan.</p>
                <Link to="/select-plan" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-600 transition">
                  View plans <ArrowLeft size={14} className="rotate-180" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
