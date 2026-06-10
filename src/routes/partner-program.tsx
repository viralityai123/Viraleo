import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/partner-program")({
  head: () => ({
    meta: [
      { title: "Viraleo Partner Program — Earn 50% Commission" },
      {
        name: "description",
        content:
          "Join the Viraleo Partner Program. Earn 50% recurring commission on every referral. Promote the best YouTube channel intelligence tool.",
      },
      { property: "og:title", content: "Viraleo Partner Program — Earn 50% Commission" },
      {
        property: "og:description",
        content: "Earn 50% recurring commission. Join the Viraleo partner program.",
      },
      { name: "twitter:title", content: "Viraleo Partner Program" },
      { name: "twitter:description", content: "Earn 50% commission on every referral." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/partner-program" }],
  }),
  component: PartnerProgramPage,
});

const fmtUSD = (n: number) => "$" + Math.round(n).toLocaleString();
const fmtUSD2 = (n: number) => "$" + n.toFixed(2);

function Calculator() {
  const [aud, setAud] = useState(25000);
  const [cvr, setCvr] = useState(2);
  const [mix, setMix] = useState(60);

  const refs = Math.round((aud * cvr) / 100);
  const proRefs = Math.round((refs * mix) / 100);
  const teamRefs = refs - proRefs;
  const proP = 29,
    teamP = 79;
  const monthly = (proRefs * proP + teamRefs * teamP) * 0.5;
  const perRef = refs > 0 ? monthly / refs : 0;

  return (
    <div className="calc-wrap" id="calculator">
      <div className="calc-slider-row">
        <div className="calc-slider-label">
          <span className="calc-slider-name">Monthly audience reach</span>
          <span className="calc-slider-val">
            {aud >= 1000 ? `${(aud / 1000).toFixed(0)}k viewers` : `${aud} viewers`}
          </span>
        </div>
        <input
          className="calc-slider"
          type="range"
          min={1000}
          max={500000}
          step={1000}
          value={aud}
          onChange={(e) => setAud(+e.target.value)}
          style={{ "--p": `${((aud - 1000) / (500000 - 1000)) * 100}%` } as React.CSSProperties}
        />
      </div>
      <div className="calc-slider-row">
        <div className="calc-slider-label">
          <span className="calc-slider-name">Conversion rate</span>
          <span className="calc-slider-val">{cvr}%</span>
        </div>
        <input
          className="calc-slider"
          type="range"
          min={1}
          max={10}
          step={1}
          value={cvr}
          onChange={(e) => setCvr(+e.target.value)}
          style={{ "--p": `${((cvr - 1) / (10 - 1)) * 100}%` } as React.CSSProperties}
        />
      </div>
      <div className="calc-slider-row" style={{ marginBottom: 0 }}>
        <div className="calc-slider-label">
          <span className="calc-slider-name">Plan mix (% on Pro at $29/mo)</span>
          <span className="calc-slider-val">{mix}% Pro</span>
        </div>
        <input
          className="calc-slider"
          type="range"
          min={0}
          max={100}
          step={5}
          value={mix}
          onChange={(e) => setMix(+e.target.value)}
          style={{ "--p": `${(mix / 100) * 100}%` } as React.CSSProperties}
        />
      </div>
      <div className="calc-results">
        <div className="calc-res-card">
          <div className="calc-res-label">Monthly</div>
          <div className="calc-res-val green" id="r-monthly">
            {fmtUSD(monthly)}
          </div>
        </div>
        <div className="calc-res-card">
          <div className="calc-res-label">Yearly</div>
          <div className="calc-res-val green" id="r-yearly">
            {fmtUSD(monthly * 12)}
          </div>
        </div>
        <div className="calc-res-card">
          <div className="calc-res-label">Per referral</div>
          <div className="calc-res-val green" id="r-per">
            {fmtUSD2(perRef)}
          </div>
        </div>
      </div>
    </div>
  );
}

const FAQS = [
  {
    q: "Who qualifies to apply?",
    a: "We look for creators with an engaged audience in the YouTube creator or video marketing space. No minimum subscriber count — we care about fit and authenticity, not vanity numbers.",
  },
  {
    q: "How exactly does the 50% commission work?",
    a: "Every customer who signs up through your unique link or uses your discount code is attributed to you. You earn 50% of their first payment — and 50% of every renewal for as long as they stay subscribed.",
  },
  {
    q: "When and how do I get paid?",
    a: "Payouts go out on the 1st of every month via Stripe or PayPal. There's no minimum payout threshold — even $5 gets sent. International partners supported in 40+ currencies.",
  },
  {
    q: "Can I see my stats in real time?",
    a: "Yes — your partner dashboard shows clicks, trials, conversions, earnings, and payout history updated live. No waiting for end-of-month reports.",
  },
  {
    q: "Is there an exclusivity requirement?",
    a: "No. You can promote other tools freely. We just ask that when you mention Viraleo, it's genuine — no mass-spamming or misleading claims about the product.",
  },
];

function FaqItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <div className="faq-q" onClick={onToggle}>
        {q}
        <div className="faq-icon">+</div>
      </div>
      <div className="faq-a">{a}</div>
    </div>
  );
}

function scrollToCalculator() {
  document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
}

function PartnerProgramPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const goLogin = () => navigate({ to: "/login", search: { from: "partner" } });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .pp{--sf: -apple-system,"SF Pro Display","SF Pro Text",BlinkMacSystemFont,"Helvetica Neue",sans-serif;font-family:var(--sf);color:#0a0a0a;overflow-x:hidden;background:#f0fdf4}
        .pp .section{padding:80px 48px;max-width:760px;margin:0 auto}
        .pp .nav{display:flex;align-items:center;justify-content:space-between;padding:18px 40px;background:rgba(240,253,244,0.85);backdrop-filter:blur(12px);border-bottom:0.5px solid rgba(16,185,129,0.15);position:sticky;top:0;z-index:100}
        .pp .nav-logo{font-weight:700;font-size:17px;letter-spacing:-0.5px;color:#0a0a0a}
        .pp .nav-logo span{color:#10b981}
        .pp .nav-pill{background:#0a0a0a;color:#f0fdf4;font-size:13px;font-weight:500;padding:9px 20px;border-radius:100px;letter-spacing:-0.2px;cursor:pointer;transition:opacity .2s;position:relative;overflow:hidden;isolation:isolate}
        .pp .nav-pill:hover{opacity:.85}
        .pp .nav-pill::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 30%,rgba(255,255,255,0.25) 50%,transparent 70%);background-size:200% 100%;background-position:200% 0;pointer-events:none;z-index:1;border-radius:inherit}
        .pp .nav-pill:hover::after{animation:ppShimmer 1.2s linear infinite}
        .pp .hero{text-align:center;padding:100px 40px 80px;background:linear-gradient(180deg,#f0fdf4 0%,#ecfdf5 100%)}
        .pp .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,0.08);border:0.5px solid rgba(16,185,129,0.25);border-radius:100px;padding:7px 16px;font-size:13px;font-weight:500;color:#059669;margin-bottom:32px;letter-spacing:0.1px}
        .pp .hero-eyebrow::before{content:"\\2726";font-size:11px}
        .pp .hero-h1{font-size:62px;font-weight:700;letter-spacing:-2.5px;line-height:1.05;color:#0a0a0a;margin-bottom:6px}
        .pp .hero-h1 em{font-style:italic;font-family:'Playfair Display',serif;background:linear-gradient(90deg,#10b981,#34d399,#6ee7b7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .pp .rainbow-wrap{position:relative;display:inline-block}
        .pp .rainbow-svg{position:absolute;bottom:-8px;left:-4px;width:calc(100% + 8px);height:18px;overflow:visible}
        .pp .hero-sub{font-size:18px;color:#4b5563;line-height:1.65;max-width:500px;margin:32px auto 40px;letter-spacing:-0.3px;font-weight:400}
        .pp .hero-sub strong{color:#0a0a0a;font-weight:600}
        .pp .hero-ctas{display:flex;gap:12px;justify-content:center;align-items:center}
        .pp .cta-primary{background:#0a0a0a;color:#f0fdf4;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;letter-spacing:-0.3px;cursor:pointer;border:none;transition:transform .2s,box-shadow .2s;position:relative;overflow:hidden;isolation:isolate}
        .pp .cta-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,0.18)}
        .pp .cta-primary::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 30%,rgba(255,255,255,0.2) 50%,transparent 70%);background-size:200% 100%;background-position:200% 0;pointer-events:none;z-index:1;border-radius:inherit}
        .pp .cta-primary:hover::after{animation:ppShimmer 1.2s linear infinite}
        .pp .cta-sec{background:transparent;color:#0a0a0a;padding:14px 24px;border-radius:100px;font-size:15px;font-weight:500;letter-spacing:-0.3px;cursor:pointer;border:0.5px solid rgba(0,0,0,0.2);transition:background .2s;position:relative;overflow:hidden;isolation:isolate}
        .pp .cta-sec:hover{background:rgba(0,0,0,0.04)}
        .pp .cta-sec::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 30%,rgba(0,0,0,0.06) 50%,transparent 70%);background-size:200% 100%;background-position:200% 0;pointer-events:none;z-index:2;border-radius:inherit}
        .pp .cta-sec:hover::after{animation:ppShimmer 1.2s linear infinite}
        .pp .badge-strip{display:flex;justify-content:center;gap:12px;padding:28px 40px;flex-wrap:wrap}
        .pp .badge{background:white;border:0.5px solid rgba(16,185,129,0.2);border-radius:100px;padding:8px 18px;font-size:13px;color:#374151;display:flex;align-items:center;gap:7px;font-weight:500}
        .pp .badge-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#10b981,#34d399)}
        .pp .commission-blk{text-align:center;padding:80px 40px;background:white;border-top:0.5px solid rgba(16,185,129,0.12);border-bottom:0.5px solid rgba(16,185,129,0.12)}
        .pp .commission-num{font-size:120px;font-weight:800;letter-spacing:-6px;line-height:1;background:linear-gradient(135deg,#10b981 0%,#34d399 40%,#6ee7b7 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .pp .commission-label{font-size:22px;font-weight:600;color:#0a0a0a;letter-spacing:-0.6px;margin-top:8px}
        .pp .commission-sub{font-size:16px;color:#6b7280;margin-top:10px;font-weight:400}
        .pp .perks-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:48px}
        .pp .perk-card{background:white;border:0.5px solid rgba(16,185,129,0.15);border-radius:20px;padding:28px 24px;transition:transform .2s,box-shadow .2s}
        .pp .perk-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(16,185,129,0.1)}
        .pp .perk-icon{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#d1fae5,#a7f3d0);display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:20px}
        .pp .perk-title{font-size:15px;font-weight:600;color:#0a0a0a;letter-spacing:-0.3px;margin-bottom:8px}
        .pp .perk-body{font-size:13px;color:#6b7280;line-height:1.6}
        .pp .hiw-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:48px;position:relative}
        .pp .hiw-connector{position:absolute;top:28px;left:calc(33.3% - 12px);right:calc(33.3% - 12px);height:1px;background:linear-gradient(90deg,#10b981,#34d399,#10b981);opacity:0.3}
        .pp .hiw-step{text-align:center;position:relative}
        .pp .hiw-num{width:56px;height:56px;border-radius:50%;background:#0a0a0a;color:#f0fdf4;font-size:22px;font-weight:700;letter-spacing:-1px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
        .pp .hiw-step-title{font-size:16px;font-weight:600;color:#0a0a0a;letter-spacing:-0.4px;margin-bottom:8px}
        .pp .hiw-step-body{font-size:13px;color:#6b7280;line-height:1.6}
        .pp .calc-wrap{background:white;border:0.5px solid rgba(16,185,129,0.15);border-radius:24px;padding:36px;margin-top:48px}
        .pp .calc-slider-row{margin-bottom:28px}
        .pp .calc-slider-label{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .pp .calc-slider-name{font-size:14px;font-weight:500;color:#374151;letter-spacing:-0.2px}
        .pp .calc-slider-val{font-size:14px;font-weight:600;color:#10b981;letter-spacing:-0.2px}
        .pp .calc-slider{width:100%;-webkit-appearance:none;height:5px;border-radius:100px;background:linear-gradient(90deg,#10b981 var(--p,50%),#e5e7eb var(--p,50%));outline:none;cursor:pointer}
        .pp .calc-slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:white;border:2px solid #10b981;box-shadow:0 2px 8px rgba(16,185,129,0.25);cursor:pointer}
        .pp .calc-results{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:32px;padding-top:28px;border-top:0.5px solid rgba(0,0,0,0.06)}
        .pp .calc-res-card{background:#f0fdf4;border-radius:16px;padding:20px 16px;text-align:center}
        .pp .calc-res-label{font-size:12px;color:#6b7280;font-weight:500;letter-spacing:0.1px;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px}
        .pp .calc-res-val{font-size:26px;font-weight:700;letter-spacing:-1px;color:#0a0a0a}
        .pp .calc-res-val.green{background:linear-gradient(135deg,#10b981,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .pp .faq-list{margin-top:48px;display:flex;flex-direction:column;gap:8px}
        .pp .faq-item{background:white;border:0.5px solid rgba(0,0,0,0.08);border-radius:16px;overflow:hidden;transition:border-color .2s}
        .pp .faq-item.open{border-color:rgba(16,185,129,0.3)}
        .pp .faq-q{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;cursor:pointer;font-size:15px;font-weight:500;color:#0a0a0a;letter-spacing:-0.3px;user-select:none}
        .pp .faq-icon{width:28px;height:28px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;color:#6b7280;flex-shrink:0;transition:background .2s,transform .3s}
        .pp .faq-item.open .faq-icon{background:#d1fae5;color:#10b981;transform:rotate(45deg)}
        .pp .faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease,padding .35s ease;padding:0 24px;font-size:14px;color:#6b7280;line-height:1.7}
        .pp .faq-item.open .faq-a{max-height:200px;padding:0 24px 20px}
        .pp .cta-bottom{background:#0a0a0a;border-radius:28px;padding:64px 48px;text-align:center;margin:48px 0 0}
        .pp .cta-bottom-label{font-size:13px;font-weight:500;color:#6b7280;letter-spacing:1px;text-transform:uppercase;margin-bottom:20px}
        .pp .cta-bottom-h{font-size:42px;font-weight:700;letter-spacing:-1.5px;line-height:1.1;color:white;margin-bottom:16px}
        .pp .cta-bottom-h em{font-style:italic;font-family:'Playfair Display',serif;background:linear-gradient(90deg,#34d399,#6ee7b7,#a7f3d0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .pp .cta-bottom-sub{font-size:16px;color:#9ca3af;margin-bottom:36px;line-height:1.6}
        .pp .cta-bottom-btn{background:white;color:#0a0a0a;padding:15px 32px;border-radius:100px;font-size:16px;font-weight:600;letter-spacing:-0.4px;cursor:pointer;border:none;transition:transform .2s;display:inline-block;position:relative;overflow:hidden;isolation:isolate}
        .pp .cta-bottom-btn:hover{transform:translateY(-2px)}
        .pp .cta-bottom-btn::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 30%,rgba(0,0,0,0.08) 50%,transparent 70%);background-size:200% 100%;background-position:200% 0;pointer-events:none;z-index:1;border-radius:inherit}
        .pp .cta-bottom-btn:hover::after{animation:ppShimmer 1.2s linear infinite}
        .pp .eyebrow{font-size:13px;font-weight:500;color:#10b981;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px}
        .pp .section-h{font-size:40px;font-weight:700;letter-spacing:-1.5px;line-height:1.1;color:#0a0a0a}
        .pp .section-sub{font-size:16px;color:#6b7280;margin-top:12px;line-height:1.65;font-weight:400}
        @keyframes ppShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .pp .cta-bottom-note{font-size:12px;color:#6b7280;margin-top:20px;letter-spacing:0.2px}
      `}</style>
      <div className="pp">
        <nav className="nav">
          <div className="nav-logo">
            <span>Viraleo</span> Partners
          </div>
          <div className="nav-pill" onClick={goLogin}>
            Apply now →
          </div>
        </nav>

        <div className="hero">
          <div className="hero-eyebrow">Invite-only · For top creators only</div>
          <h1 className="hero-h1">
            Share <em>smarter.</em>
            <br />
            <span className="rainbow-wrap">
              Earn bigger.
              <svg
                className="rainbow-svg"
                viewBox="0 0 320 18"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 12 C 30 4, 60 16, 90 10 C 120 4, 150 14, 180 9 C 210 4, 240 15, 270 9 C 290 5, 308 13, 316 10"
                  fill="none"
                  stroke="url(#rg)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="25%" stopColor="#ec4899" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="75%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>
          <p className="hero-sub">
            We give our most trusted creators <strong>50% of every sale</strong> they drive. No
            caps, no tricks — just the best affiliate deal in the creator economy.
          </p>
          <div className="hero-ctas">
            <button className="cta-primary" onClick={goLogin}>
              Apply for access →
            </button>
            <button className="cta-sec" onClick={scrollToCalculator}>
              See earnings calculator
            </button>
          </div>
        </div>

        <div className="badge-strip">
          <div className="badge">
            <span className="badge-dot" />
            50% commission — industry best
          </div>
          <div className="badge">
            <span className="badge-dot" />
            Real-time earnings dashboard
          </div>
          <div className="badge">
            <span className="badge-dot" />
            Payouts every 30 days
          </div>
          <div className="badge">
            <span className="badge-dot" />
            Dedicated partner manager
          </div>
        </div>

        <div className="commission-blk">
          <div className="commission-num">50%</div>
          <div className="commission-label">Of every sale. Forever.</div>
          <div className="commission-sub">
            Most platforms offer 20–30%. We give you half. Because your audience built this.
          </div>
        </div>

        <div className="section">
          <div className="eyebrow">What you get</div>
          <div className="section-h">Every perk, no compromises.</div>
          <div className="section-sub">
            Built for creators who take content seriously. This isn't a basic referral link — it's a
            full business partnership.
          </div>
          <div className="perks-grid">
            <div className="perk-card">
              <div className="perk-icon">%</div>
              <div className="perk-title">50% revenue share</div>
              <div className="perk-body">
                Every plan — Pro, Team, Enterprise. You refer it, you earn half. No tiers, no fine
                print.
              </div>
            </div>
            <div className="perk-card">
              <div className="perk-icon">↗</div>
              <div className="perk-title">Live earnings dashboard</div>
              <div className="perk-body">
                Watch every click, trial, and conversion in real time. Your own partner portal,
                always on.
              </div>
            </div>
            <div className="perk-card">
              <div className="perk-icon">✦</div>
              <div className="perk-title">Exclusive partner badge</div>
              <div className="perk-body">
                Verified Viraleo Partner status on your profile. Signals trust to your audience
                instantly.
              </div>
            </div>
            <div className="perk-card">
              <div className="perk-icon">⚡</div>
              <div className="perk-title">Priority support</div>
              <div className="perk-body">
                Direct Slack access to our team. Questions answered in hours, not days. VIP
                treatment.
              </div>
            </div>
            <div className="perk-card">
              <div className="perk-icon">◈</div>
              <div className="perk-title">Early feature access</div>
              <div className="perk-body">
                You test new tools before anyone else. Be the first to cover what's coming — before
                the internet does.
              </div>
            </div>
          </div>
        </div>

        <div className="section" style={{ paddingTop: 0 }}>
          <div className="eyebrow">How it works</div>
          <div className="section-h">Three steps to earning.</div>
          <div className="section-sub">
            Apply once, get approved, and start earning. The whole setup takes under 10 minutes.
          </div>
          <div className="hiw-steps">
            <div className="hiw-connector" />
            <div className="hiw-step">
              <div className="hiw-num">1</div>
              <div className="hiw-step-title">Apply</div>
              <div className="hiw-step-body">
                Fill out a short form. We review your channel and audience fit within 48 hours.
              </div>
            </div>
            <div className="hiw-step">
              <div className="hiw-num">2</div>
              <div className="hiw-step-title">Get your link</div>
              <div className="hiw-step-body">
                Instantly get your unique partner link and custom discount code for your audience.
              </div>
            </div>
            <div className="hiw-step">
              <div className="hiw-num">3</div>
              <div className="hiw-step-title">Earn 50%</div>
              <div className="hiw-step-body">
                Share naturally. Earn half of every sale. Monthly payouts, zero minimums.
              </div>
            </div>
          </div>
        </div>

        <div className="section" style={{ paddingTop: 0 }}>
          <div className="eyebrow">Earnings calculator</div>
          <div className="section-h">
            <span className="rainbow-wrap">
              Your number.
              <svg
                className="rainbow-svg"
                viewBox="0 0 260 18"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 12 C 25 4, 55 15, 85 9 C 115 3, 145 15, 175 9 C 200 4, 225 14, 254 10"
                  fill="none"
                  stroke="url(#rg2)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="rg2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="33%" stopColor="#8b5cf6" />
                    <stop offset="66%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            &nbsp;Slide to see it.
          </div>
          <div className="section-sub">
            Drag the sliders to model your potential monthly earnings as a Viraleo Partner.
          </div>
          <Calculator />
        </div>

        <div className="section" style={{ paddingTop: 0 }}>
          <div className="eyebrow">FAQ</div>
          <div className="section-h">Everything you need to know.</div>
          <div className="faq-list">
            {FAQS.map((f, i) => (
              <FaqItem
                key={i}
                q={f.q}
                a={f.a}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>

        <div className="section" style={{ paddingTop: 0, paddingBottom: 80 }}>
          <div className="cta-bottom">
            <div className="cta-bottom-label">Ready to partner?</div>
            <div className="cta-bottom-h">
              Your audience is an
              <br />
              <em>asset. Start treating it that way.</em>
            </div>
            <div className="cta-bottom-sub">
              Applications reviewed within 48 hours. Spots are limited — we keep this program small
              and exclusive by design.
            </div>
            <button className="cta-bottom-btn" onClick={goLogin}>
              Apply for partner access →
            </button>
            <div className="cta-bottom-note">
              Invite-only · Premium creators only · 50% commission
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
