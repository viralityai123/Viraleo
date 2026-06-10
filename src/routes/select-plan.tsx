import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, Lock, Sparkles, Zap, Crown } from "lucide-react";
import { toast } from "sonner";
import { ViraleoLogo } from "@/components/ViraleoLogo";
import { type PlanTier } from "@/lib/plans";
import { assignPlan } from "@/lib/user-state";
import { getSessionFromDocument } from "@/lib/auth/session";
import { isLsConfigured, createLsCheckout } from "@/routes/api/lemon/checkout";
import { trackSignup } from "@/lib/partner-store";
import { createServerFn } from "@tanstack/react-start";
import "@/components/landing-v2/landing-v2.css";

const fetchUserPlanFromKv = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const { getUserState } = await import("@/lib/user-state-server");
    const state = await getUserState(data.email);
    return state.hasPlan ? state.plan : null;
  });

const recordReferralSignup = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; email: string }) => d)
  .handler(async ({ data }) => {
    const { slug, email } = data;
    await trackSignup(slug, email);
    return { ok: true };
  });

const PRICING = [
  {
    tier: "free" as PlanTier,
    name: "Free",
    price: "$0",
    sub: "Forever",
    icon: Sparkles,
    feats: ["1 analysis / month", "Pre-Analysis (basic)", "Channel digests", "Public benchmarks"],
    cta: "Start free",
    popular: false,
    original: null,
    discount: null,
    color: "#18c964",
  },
  {
    tier: "creator" as PlanTier,
    name: "Creator",
    price: "$20",
    original: "$25",
    sub: "per month",
    icon: Zap,
    feats: ["10 analyses / day", "All 4 tools unlocked", "Thumbnail testing", "Shadowban detector"],
    cta: "Start Creator",
    popular: true,
    discount: "Save $5 — 20% off",
    color: "#7c5cff",
  },
  {
    tier: "pro" as PlanTier,
    name: "Pro",
    price: "$50",
    original: "$100",
    sub: "per month",
    icon: Crown,
    feats: ["25 analyses / day", "Everything in Creator", "Niche deep-dives", "Competitor tracking", "Priority support"],
    cta: "Go Pro",
    popular: false,
    discount: null,
    color: "#ff9f1a",
  },
];

export const Route = createFileRoute("/select-plan")({
  head: () => ({
    meta: [
      { title: "Choose your plan ÔÇö Viraleo" },
      { name: "description", content: "Pick the right plan for your YouTube content workflow. Free, Creator ($20/mo), or Pro ($50/mo)." },
      { property: "og:title", content: "Choose your plan ÔÇö Viraleo" },
      { property: "og:description", content: "Pick your Viraleo plan ÔÇö Free, Creator ($20/mo), or Pro ($50/mo)." },
      { property: "og:image", content: "https://viraleo.pro/vi-logo.png" },
      { property: "og:url", content: "https://viraleo.pro/select-plan" },
      { name: "twitter:title", content: "Choose your plan ÔÇö Viraleo" },
      { name: "twitter:description", content: "Pick your Viraleo plan." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/select-plan" }],
  }),
  component: SelectPlanPage,
});

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`lv2-nav ${!scrolled ? "lv2-nav--expanded" : ""}`}>
      <ViraleoLogo size={scrolled ? "sm" : "md"} linkTo="/" />
      <div className="hide-m flex items-center gap-1 ml-3">
        <a href="/" className="l">Home</a>
      </div>
      <Link to="/" className="cta ml-1">
        Dashboard <ArrowRight size={scrolled ? 14 : 16} />
      </Link>
    </nav>
  );
}

function SelectPlanPage() {
  const navigate = useNavigate();
  const [currentTier, setCurrentTier] = useState<PlanTier | null>(null);
  const [selecting, setSelecting] = useState<PlanTier | null>(null);

  useEffect(() => {
    async function init() {
      const session = getSessionFromDocument();
      if (!session?.email) return;
      try {
        const tier = await fetchUserPlanFromKv({ data: { email: session.email } });
        if (tier && tier !== "free") {
          navigate({ to: "/" });
          return;
        }
        if (tier) setCurrentTier(tier);
      } catch {
        /* ignore */
      }
    }
    init();
  }, []);

  async function handleSelect(tier: PlanTier) {
    if (tier === "free") {
      setSelecting(tier);
      try {
        await assignPlan({ data: { tier } });
        navigate({ to: "/pre-analysis", search: { channel: undefined, activityId: undefined } });
      } catch {
        toast.error("Could not save plan. Please try again.");
        setSelecting(null);
      }
      return;
    }

    setSelecting(tier);

    const ref = localStorage.getItem("viraleo:referrer") || undefined;

    // Try LS checkout first (redirect to LS payment page)
    try {
      const lsConfigured = await isLsConfigured();
      if (lsConfigured) {
        const session = getSessionFromDocument();
        const email = session?.email || "";
        const name = session?.name || "Creator";
        const checkoutUrl = await createLsCheckout({ data: { tier, email, name, referrer: ref } });
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
      }
    } catch (e) {
      // fall through to local fallback
    }

    // No fallback ÔÇö user must complete payment to unlock paid plan
    toast.error("Payment service unavailable. Please try again.");
    setSelecting(null);
  }

  return (
    <main className="lv2" style={{ minHeight: "100vh" }}>
      <Nav />
      <section className="lv2-section" style={{ paddingTop: 160, paddingBottom: 100 }}>
        <div className="text-center mb-14">
          <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[color:var(--lv2-accent-deep)]">Pick your plan</div>
          <h2 className="display mt-3" style={{ fontSize: "clamp(34px, 5vw, 64px)" }}>You're in. Now level up.</h2>
          <p className="mt-4 text-[color:var(--lv2-ink-soft)] text-[16px] max-w-md mx-auto">
            Choose the plan that fits your workflow. Upgrade or downgrade anytime.
          </p>
        </div>
        <div className="lv2-container grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {PRICING.map((p) => {
            const isCurrent = currentTier === p.tier;
            const isLoading = selecting === p.tier;
            return (
              <div key={p.name} className={`lv2-price ${p.popular ? "popular" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p.icon size={18} style={{ color: p.color }} />
                    <div className="text-[13px] font-semibold tracking-wider uppercase label">{p.name}</div>
                  </div>
                  {p.popular && <span className="text-[10.5px] font-bold px-2 py-1 rounded-full bg-[color:var(--lv2-accent)] text-black">POPULAR</span>}
                  {isCurrent && <span className="text-[10.5px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">CURRENT</span>}
                </div>
                <div className="mt-5">
                  <div className="flex items-baseline gap-2">
                    <span className="display" style={{ fontSize: 54 }}>{p.price}</span>
                    <span className="label text-[13px]">{p.sub}</span>
                  </div>
                  {p.original && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="lv2-original-price text-[15px]">{p.original}</span>
                      {p.discount && <span className="lv2-discount-badge">{p.discount}</span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleSelect(p.tier)}
                  disabled={isLoading || isCurrent}
                  className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-semibold text-[14px] transition-all lv2-plan-btn ${
                    p.popular
                      ? "bg-[color:var(--lv2-accent)] text-black hover:bg-[#1de077]"
                      : "bg-[color:var(--lv2-ink)] text-white hover:bg-[#1a1a22]"
                  } ${isCurrent ? "opacity-50 cursor-default" : ""}`}
                >
                  {isLoading ? "Saving..." : isCurrent ? "Current plan" : p.tier === "free" ? p.cta : `Subscribe`}
                  {!isLoading && !isCurrent && <ArrowRight size={15} />}
                </button>
                <ul className="mt-7 space-y-3">
                  {p.feats.map(function (f: string) {
                    if (p.tier === "free" && f === "Public benchmarks") {
                      return (
                        <li key={f} className="flex gap-2.5 text-[14px] feat opacity-60">
                          <span className="flex gap-2.5 items-center">
                            <Lock size={17} className="text-blue-400 shrink-0" />
                            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{f}</span>
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={f} className="flex gap-2.5 text-[14px] feat">
                        <span className="flex gap-2.5 items-center">
                          <CheckCircle2 size={17} className={p.popular ? "text-[color:var(--lv2-accent)] shrink-0" : "text-[color:var(--lv2-accent-deep)] shrink-0"} />
                          <span>{f}</span>
                        </span>
                      </li>
                    );
                  }.bind(p))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="text-center mt-10">
          <Link to="/" className="lv2-btn-ghost text-[14px]">
            Skip for now — go to dashboard →
          </Link>
        </div>
      </section>
    </main>
  );
}
