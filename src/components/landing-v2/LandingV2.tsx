import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence, useInView, useScroll, useTransform } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ArrowRight,
  Sparkles,
  Eye,
  Activity,
  ShieldAlert,
  ImageIcon,
  Search,
  Layers,
  Zap,
  TrendingUp,
  XCircle,
  Link2,
  FileText,
} from "lucide-react";
import { ViraleoLogo } from "@/components/ViraleoLogo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Quote, CheckCircle2, Lock } from "lucide-react";
import "./landing-v2.css";

/* ────────────────────────────────────────────────────────────────────── */
/* Data                                                                    */
/* ────────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Search,
    eyebrow: "Pre-Analysis",
    title: "Score any video before you hit upload.",
    body: "Drop a draft. Viraleo grades the hook, structure, thumbnail, and retention curve against the top performers in your niche — with exact line edits.",
    color: "#18c964",
  },
  {
    icon: ImageIcon,
    eyebrow: "Thumbnail Test",
    title: "Find your winning thumbnail in seconds.",
    body: "Upload variants. We rank them by predicted CTR using the same patterns that hit on your competitors this week.",
    color: "#7c5cff",
  },
  {
    icon: Sparkles,
    eyebrow: "Niche Ranker",
    title: "See where the views actually live.",
    body: "Real RPM, real outliers, real ceiling. Stop guessing if a niche is saturated — we show you the math behind the channels eating.",
    color: "#ff9f1a",
  },
  {
    icon: ShieldAlert,
    eyebrow: "Shadowban Detector",
    title: "Find if your channel is shadowbanned or not.",
    body: "Real AI-powered indexability audit. Detect algorithmic suppression, impression throttling, and get a step-by-step escape protocol to restore your reach.",
    color: "#ff3d8b",
  },
];

const METRICS = [
  { v: 20, suffix: "K+", label: "Videos analyzed" },
  { v: 12, suffix: "k", label: "Channels decoded" },
  { v: 96, suffix: "%", label: "Hook lift, avg" },
  { v: 7, suffix: "s", label: "Est. report time" },
];

const TESTIMONIALS = [
  {
    quote: "Viraleo caught a hook pacing issue that was costing me 40% of my retention. Fixed it in one upload — views jumped 3x.",
    name: "Alex Chen",
    handle: "@alexcreates",
    avatar: "",
    role: "Gaming creator, 240K subs",
  },
  {
    quote: "I was about to launch in a saturated niche. The Niche Ranker showed me a sub-niche with 4x less competition and higher RPM. Best decision I made.",
    name: "Sarah Mitchell",
    handle: "@sarahmitchell",
    avatar: "",
    role: "Tech reviewer, 180K subs",
  },
  {
    quote: "The Thumbnail Test is insane. Uploaded 3 variants, got a clear winner with 12.4% predicted CTR. Real result? 11.8%. Scarily accurate.",
    name: "Marcus Johnson",
    handle: "@marcusj",
    avatar: "",
    role: "Finance creator, 520K subs",
  },
  {
    quote: "Shadowban Detector saved my channel. I was being suppressed and had no idea. Followed the escape protocol and my impressions recovered in 2 weeks.",
    name: "Priya Sharma",
    handle: "@priyasharma",
    avatar: "",
    role: "Lifestyle vlogger, 95K subs",
  },
];

const MARQUEE_SHORTS = [
  { id: "se50viFJ0AQ", name: "MrBeast", views: "1.4B", title: "I Spent 50 Hours In Solitary Confinement", logo: "/logo-mrbeast.png", verified: true },
  { id: "BoJOtCo3n80", name: "Slam Dunk", views: "89M", title: "SICKEST DUNK YOU'LL SEE TODAY 🔥", logo: "/logo-slamdunk.png", verified: true },
  { id: "ApgkbVU9Wz0", name: "Flexy", views: "45M", title: "30 Day Transformation ⚡️", logo: "/logo-flexy.png", verified: true },
  { id: "obZcEJj5jf8", name: "Discovery Dose", views: "67M", title: "Ocean's Deepest Secret 🐙", logo: "/logo-discoverydose.png", verified: true },
  { id: "YlvcFJOE-OE", name: "MrBeast", views: "1.7B", title: "Last To Leave Circle Wins $500K", logo: "/logo-mrbeast.png", verified: true },
  { id: "XDw7eX3Dl9U", name: "Slam Dunk", views: "72M", title: "BEST ALLEY-OOP OF THE YEAR 🏀", logo: "/logo-slamdunk.png", verified: true },
  { id: "Loi9S0InnZ4", name: "Flexy", views: "38M", title: "IMPOSIBLE FLEX 😱", logo: "/logo-flexy.png", verified: true },
  { id: "wor61NPXVyk", name: "Discovery Dose", views: "54M", title: "How Sharks See The World 🌊", logo: "/logo-discoverydose.png", verified: true },
];

const FAQS = [
  {
    q: "How is this different from VidIQ or TubeBuddy?",
    a: "Those tools optimize keywords. Viraleo decodes the actual structural patterns — hooks, pacing, thumbnail logic, retention design — that make a video go viral in your niche.",
  },
  {
    q: "Do I need a YouTube account to use it?",
    a: "Nope. Drop any channel URL or video file. Viraleo works on public data and your own uploads — no OAuth required to get started.",
  },
  {
    q: "How fresh is the data?",
    a: "We pull live YouTube data on every analysis. No 24-hour caches. The hook trend you see is the one that's actually hitting right now.",
  },
  {
    q: "Is my draft footage private?",
    a: "Yes. Drafts you upload for Pre-Analysis are processed in-memory and never shown to other users.",
  },
  {
    q: "Can I cancel anytime?",
    a: "One-click cancel. No retention loops, no calls. We'd rather you come back because it works.",
  },
  {
    q: "How do daily credits work?",
    a: "Your credits refill every day at midnight. Each analysis costs 1 credit. Unused credits don't roll over — so use 'em or lose 'em.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "You wait for the daily reset or upgrade to a higher tier. No surprise charges — you'll see the counter right in your dashboard.",
  },
  {
    q: "Can I upgrade or downgrade mid-cycle?",
    a: "Yes. Changes take effect immediately and your credits reset to the new daily limit on switch.",
  },
  {
    q: "Which tool should I start with?",
    a: "Pre-Analysis if you have a draft ready. Niche Ranker if you're picking your next channel. Thumbnail Test if you're about to hit publish.",
  },
  {
    q: "How accurate is the AI analysis?",
    a: "It's trained on viraleo patterns from live YouTube data — not generic guru advice. Every insight cites real video titles, views per day, and comment themes you can verify.",
  },
  {
    q: "Does this work for both Shorts and long-form?",
    a: "Every tool adapts to the format. Whether it's a 30-second Short or a 30-minute deep dive, the analysis adjusts its criteria — pacing thresholds, hook windows, thumbnail density.",
  },
  {
    q: "Can I analyze channels in other languages?",
    a: "Yes. Viraleo works on any public YouTube channel regardless of language. The AI reads the content patterns, not just the words.",
  },
];

/* ────────────────────────────────────────────────────────────────────── */
/* Hero — clean & premium                                                  */
/* ────────────────────────────────────────────────────────────────────── */

function Hero() {
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGlitching(true), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="lv2-section relative" style={{ paddingTop: 180, paddingBottom: 100 }}>

      <div className="lv2-container relative z-10 text-center">
        {/* Trust badge — 5 stars + count (crayo style) */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[color:var(--lv2-hairline)] shadow-sm"
        >
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.15, ease: "backOut" }}
                style={{ display: "inline-flex" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5">
                  <polygon points="12,2 15,9 22,9 16,14 18,22 12,17 6,22 8,14 2,9 9,9" />
                </svg>
              </motion.span>
            ))}
          </div>
          <span className="text-[12.5px] font-medium text-[color:var(--lv2-ink-soft)]">
            Trusted by 100K Creators Worldwide.
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="display mx-auto mt-7 text-center"
          style={{ fontSize: "clamp(32px, 7vw, 100px)", lineHeight: 1.05, maxWidth: "100%" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span className="lv2-hero-line">
            Stop Uploading{" "}
            <span className={`lv2-blind ${glitching ? "lv2-blind--hit" : ""}`}>
              Blind
            </span>
          </span>
          <span className="lv2-hero-line">
            Upload{" "}
            <span className="lv2-rainbow-underline">
              Strategically
              <svg className="lv2-underline-svg" viewBox="0 0 300 24" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ff0040" />
                    <stop offset="20%" stopColor="#ff8a00" />
                    <stop offset="40%" stopColor="#ffe600" />
                    <stop offset="60%" stopColor="#00cc44" />
                    <stop offset="80%" stopColor="#0088ff" />
                    <stop offset="100%" stopColor="#8800ff" />
                  </linearGradient>
                </defs>
                <path
                  d="M10,18 C30,10 50,22 70,14 C90,8 110,20 130,12 C150,6 170,18 190,10 C210,4 230,16 250,8 C270,2 290,14 290,14"
                  fill="none"
                  stroke="url(#rainbow)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="mx-auto mt-7 text-[color:var(--lv2-ink-soft)]"
          style={{ fontSize: "clamp(16px, 1.6vw, 20px)", maxWidth: 620, lineHeight: 1.45 }}
        >
          Viraleo decodes the hooks, retention, thumbnails, and niche patterns
          behind every viral video — so you stop guessing and start shipping.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.26 }}
          className="mt-9 flex items-center justify-center gap-3 flex-wrap"
        >
          <Link to="/login" className="lv2-btn-primary">
            Analyze Your First Video
            <ArrowRight size={16} />
          </Link>
        </motion.div>

      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Product mock with floating chips                                        */
/* ────────────────────────────────────────────────────────────────────── */

function ProductMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="lv2-section" id="how" style={{ paddingTop: 40 }}>
      <div className="lv2-container">
        <div className="text-center mb-14">
          <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[color:var(--lv2-accent-deep)]">The dashboard</div>
          <h2 className="display mt-3" style={{ fontSize: "clamp(34px, 5vw, 64px)" }}>
            Every signal, on one screen.
          </h2>
        </div>

        <div ref={ref} className="relative max-w-[1080px] mx-auto">
          {/* Mobile scroll hint */}
          <p className="md:hidden text-center text-[11px] text-[color:var(--lv2-ink-mute)] mb-3">
            ← Swipe to explore →
          </p>
          {/* Horizontal scroll container on mobile so frame is never clipped */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible pb-2 md:pb-0">
            <div style={{ minWidth: "min(100%, 720px)" }}>
              <motion.div
                initial={{ opacity: 0, y: 60, rotateX: 8 }}
                animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
                transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
                className="lv2-frame"
                style={{ transformPerspective: 1400 }}
              >
                <div className="bar">
                  <i /><i /><i />
                  <span className="url">viraleo.pro / mrbeast</span>
                </div>
                <MockDashboard />
              </motion.div>
            </div>
          </div>

          {/* floating chips — desktop only */}
          {[
            { x: "-8%", y: "12%", dot: "#18c964", k: "Hook score", v: "94" },
            { x: "92%", y: "20%", dot: "#7c5cff", k: "Predicted CTR", v: "12.8%" },
            { x: "-6%", y: "70%", dot: "#ff9f1a", k: "Niche RPM", v: "$38" },
            { x: "94%", y: "78%", dot: "#ff3d8b", k: "Outlier index", v: "3.4×" },
          ].map((chip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.5 + i * 0.12, ease: "backOut" }}
              className="lv2-chip hidden md:flex"
              style={{ left: chip.x, top: chip.y, transform: "translate(-50%, -50%)" }}
            >
              <span className="dot" style={{ background: chip.dot }} />
              <span className="k">{chip.k}</span>
              <span className="v">{chip.v}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MockDashboard() {
  return (
    <div className="p-6 md:p-10 bg-white">
      <div className="grid md:grid-cols-12 gap-5">
        {/* Score ring */}
        <div className="md:col-span-4 rounded-2xl border border-[color:var(--lv2-hairline)] p-5">
          <div className="text-[11px] uppercase tracking-widest text-[color:var(--lv2-ink-mute)] font-semibold">Overall score</div>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" stroke="#eee" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="42" stroke="#18c964" strokeWidth="8" fill="none" strokeDasharray={`${(94 / 100) * 264} 264`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center display" style={{ fontSize: 28 }}>94</div>
            </div>
            <div>
              <div className="text-sm font-semibold">Top 3% in niche</div>
              <div className="text-[12.5px] text-[color:var(--lv2-ink-soft)] mt-1">Hook, structure, thumbnail all firing.</div>
            </div>
          </div>
        </div>

        {/* Metric bars */}
        <div className="md:col-span-8 rounded-2xl border border-[color:var(--lv2-hairline)] p-5">
          <div className="text-[11px] uppercase tracking-widest text-[color:var(--lv2-ink-mute)] font-semibold">Vs. niche top 10</div>
          <div className="mt-4 space-y-3">
            {[
              { l: "Hook (0–3s)", v: 96, c: "#18c964" },
              { l: "Retention curve", v: 88, c: "#7c5cff" },
              { l: "Thumbnail CTR", v: 91, c: "#ff9f1a" },
              { l: "Pacing", v: 74, c: "#ff3d8b" },
              { l: "Title clarity", v: 82, c: "#1ac8ed" },
            ].map((m) => (
              <div key={m.l}>
                <div className="flex justify-between text-[12.5px] mb-1">
                  <span className="font-medium">{m.l}</span>
                  <span className="font-semibold tabular-nums">{m.v}</span>
                </div>
                <div className="h-2 rounded-full bg-[color:var(--lv2-bg-2)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${m.v}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
                    className="h-full rounded-full"
                    style={{ background: m.c }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Retention chart */}
        <div className="md:col-span-7 rounded-2xl border border-[color:var(--lv2-hairline)] p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] uppercase tracking-widest text-[color:var(--lv2-ink-mute)] font-semibold">Retention curve</div>
            <div className="text-[12px] text-[color:var(--lv2-ink-soft)]">vs. niche median</div>
          </div>
          <svg viewBox="0 0 400 140" className="w-full h-36 mt-3">
            <defs>
              <linearGradient id="lv2grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#18c964" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#18c964" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,100 C40,30 80,40 120,55 C160,70 200,30 240,42 C280,52 320,28 360,38 L400,42 L400,140 L0,140 Z" fill="url(#lv2grad)" />
            <path d="M0,100 C40,30 80,40 120,55 C160,70 200,30 240,42 C280,52 320,28 360,38 L400,42" fill="none" stroke="#18c964" strokeWidth="2.5" />
            <path d="M0,115 C50,90 100,95 150,100 C200,105 250,98 300,102 C350,106 400,100 400,100" fill="none" stroke="#9a9aa6" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* Insights */}
        <div className="md:col-span-5 rounded-2xl border border-[color:var(--lv2-hairline)] p-5">
          <div className="text-[11px] uppercase tracking-widest text-[color:var(--lv2-ink-mute)] font-semibold">AI insights</div>
          <ul className="mt-3 space-y-2.5 text-[13px]">
            {[
              "Hook lands 1.4s too late — cut intro bumper.",
              "Thumb #2 has 18% higher contrast — ship it.",
              "Sustain pacing through 0:30–0:50 dip.",
            ].map((s) => (
              <li key={s} className="flex gap-2.5">
                <CheckCircle2 size={16} className="text-[color:var(--lv2-accent)] mt-0.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Feature reel — sticky scroll                                            */
/* ────────────────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────────────── */
/* Feature reel — tabbed (replaces broken sticky scroll)                   */
/* ────────────────────────────────────────────────────────────────────── */

function FeatureReel() {
  const [active, setActive] = useState(0);
  const f = FEATURES[active];

  return (
    <section className="lv2-section" style={{ paddingTop: 80, paddingBottom: 100 }}>
      <div className="lv2-container">
        <div className="text-center mb-12">
          <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[color:var(--lv2-accent-deep)] mb-4">
            Four tools, one suite
          </div>
          {/* Tab pills */}
          <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-[color:var(--lv2-bg-2)] flex-wrap justify-center">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200"
                  style={{
                    background: i === active ? "#fff" : "transparent",
                    color: i === active ? feat.color : "var(--lv2-ink-soft)",
                    boxShadow: i === active ? "0 2px 12px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <Icon size={15} />
                  {feat.eyebrow}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="grid md:grid-cols-2 gap-10 items-center"
          >
            {/* Left copy */}
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                style={{ background: `${f.color}1a`, color: f.color }}
              >
                <f.icon size={14} />
                <span className="text-[12px] font-semibold uppercase tracking-wider">{f.eyebrow}</span>
              </div>
              <h3 className="display" style={{ fontSize: "clamp(28px, 3.8vw, 52px)" }}>{f.title}</h3>
              <p className="mt-5 text-[color:var(--lv2-ink-soft)]" style={{ fontSize: 17, lineHeight: 1.55, maxWidth: 460 }}>{f.body}</p>
              {/* Progress dots */}
              <div className="flex gap-2 mt-8">
                {FEATURES.map((feat, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{ width: i === active ? 32 : 12, background: i === active ? f.color : "#d4d4d0" }}
                  />
                ))}
              </div>
            </div>

            {/* Right visual */}
            <div
              className="relative h-[380px] md:h-[460px] rounded-3xl"
              style={{
                background: `linear-gradient(135deg, ${f.color}, ${f.color}88)`,
                boxShadow: `0 40px 100px -30px ${f.color}66, 0 20px 40px -20px rgba(0,0,0,.15)`,
              }}
            >
              <FeatureVisual idx={active} color={f.color} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

const FEATURE_IMAGES = ["/preanalysis.png", "/tx.png", "/niche.png", "/shadow.png"];

function FeatureVisual({ idx, color }: { idx: number; color: string }) {
  return (
    <div className="absolute inset-0 p-0 flex items-center justify-center">
      <img
        src={FEATURE_IMAGES[idx]}
        alt=""
        className="w-full h-full object-cover rounded-3xl"
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Metrics                                                                 */
/* ────────────────────────────────────────────────────────────────────── */

function Counter({ to, suffix }: { to: number; suffix: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{n}{suffix}</span>;
}

function Metrics() {
  return (
    <section className="lv2-section" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div className="lv2-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
          {METRICS.map((m, i) => (
            <div key={i} className="text-center md:text-left">
              <div className="display" style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>
                <Counter to={m.v} suffix={m.suffix} />
              </div>
              <div className="mt-2 text-[13px] text-[color:var(--lv2-ink-soft)] uppercase tracking-wider font-medium">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Marquee                                                                 */
/* ────────────────────────────────────────────────────────────────────── */

function ChannelMarquee() {
  const row = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useGSAP(() => {
    if (!row.current) return;
    const halfWidth = row.current.scrollWidth / 2;
    gsap.fromTo(row.current,
      { x: 0 },
      {
        x: -halfWidth,
        duration: 60,
        ease: "none",
        repeat: -1,
        modifiers: {
          x: (x) => {
            const val = parseFloat(x);
            return (val % halfWidth) + "px";
          }
        }
      }
    );
  }, []);

  return (
    <section className="lv2-section" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div className="text-center mb-12">
        <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[color:var(--lv2-accent-deep)]">In the wild</div>
        <h2 className="display mt-3 lv2-glitch-text" style={{ fontSize: "clamp(30px, 4vw, 52px)" }}>
          They did it by trial and errors,<br />
          <span className="lv2-rainbow-shift">You do it in one click.</span>
        </h2>
      </div>
      <div className="lv2-marq-mask">
        <div ref={row} className="lv2-marq">
          {[...MARQUEE_SHORTS, ...MARQUEE_SHORTS].map((s, i) => (
            <a
              key={i}
              href={`https://www.youtube.com/shorts/${s.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="lv2-marq-card !w-[200px] !h-auto !p-0 !rounded-xl overflow-hidden flex flex-col no-underline"
              style={{ background: "#fff" }}
              onMouseEnter={() => setHoveredId(s.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: "9/16" }}>
                {hoveredId === s.id ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${s.id}?autoplay=1&mute=1&loop=1&playlist=${s.id}&controls=0&modestbranding=1&rel=0`}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media"
                    style={{ pointerEvents: "none" }}
                  />
                ) : (
                  <img
                    src={`https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="p-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <img src={s.logo} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                  <span className="text-[11px] font-bold text-ink truncate flex items-center gap-1">
                    {s.name}
                    {s.verified && (
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="#606060" className="flex-shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.5 15.5l-4-4L7 10l2.5 2.5L17 6l1.5 1.5z" fill="white" />
                      </svg>
                    )}
                  </span>
                </div>
                <span className="text-[10px] text-ink leading-tight line-clamp-2">{s.title}</span>
                <span className="text-[10px] text-ink-soft font-medium">{s.views} views</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Without vs With Viraleo                                               */
/* ────────────────────────────────────────────────────────────────────── */

const COMPARE_ROWS = [
  { bad: "Random thumbnail design", good: "AI-ranked CTR predictions" },
  { bad: "Blind hook writing", good: "Hook score (0-100) with detailed explanation" },
  { bad: "No retention insights", good: "Retention curve vs niche benchmarks" },
  { bad: "Picking niches by gut feel", good: "Niche viability grade with RPM data" },
  { bad: "Unaware of shadowban", good: "Algorithmic suppression detection" },
  { bad: "No competitor benchmarks", good: "Top 10 competitor pattern decoding" },
  { bad: "Wasting money on bad ideas", good: "Smarter pivot recommendations" },
  { bad: "No idea why views dropped", good: "Know exactly why your views dropped" },
  { bad: "Hours of manual research", good: "Full AI report in ~7 seconds" },
];

function CompareSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="lv2-section" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div className="lv2-container">
        <div className="text-center mb-14">
          <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[color:var(--lv2-accent-deep)]">The difference</div>
          <h2 className="display mt-3" style={{ fontSize: "clamp(34px, 5vw, 64px)" }}>
            Guesswork vs. Strategy.
          </h2>
        </div>

        <div ref={ref} className="max-w-4xl mx-auto">
          {/* Header row */}
          <div className="grid grid-cols-2 gap-4 mb-4 px-1">
            <div className="text-[11px] font-bold uppercase tracking-widest text-red-500/60">Without Viraleo</div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--lv2-accent)]">With Viraleo</div>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {COMPARE_ROWS.map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.35, delay: 0.04 * i, ease: [0.2, 0.8, 0.2, 1] }}
                className="grid grid-cols-2 gap-4 items-center py-3 px-4 rounded-xl"
                style={{
                  background: i % 2 === 0 ? "rgba(7,7,10,0.03)" : "transparent",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <XCircle size={16} className="text-red-300 shrink-0" />
                  <span className="text-[14px] text-[color:var(--lv2-ink-soft)]">{row.bad}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[color:var(--lv2-accent)] shrink-0" />
                  <span className="text-[14px] font-medium text-[color:var(--lv2-ink)]">{row.good}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Why split                                                               */
/* ────────────────────────────────────────────────────────────────────── */

function WhySplit() {
  return (
    <section className="lv2-section">
      <div className="lv2-container grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[color:var(--lv2-accent-deep)]">Why Viraleo</div>
          <h2 className="display mt-3" style={{ fontSize: "clamp(34px, 5vw, 64px)" }}>
            Stop guessing. <br />
            <span style={{ color: "var(--lv2-accent-deep)" }}>Start shipping</span> what works.
          </h2>
          <p className="mt-6 text-[color:var(--lv2-ink-soft)]" style={{ fontSize: 17, lineHeight: 1.55, maxWidth: 480 }}>
            Every viral video has fingerprints — pacing, framing, hook patterns. Viraleo reads those fingerprints across thousands of channels and tells you exactly which ones to copy.
          </p>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link to="/login" className="lv2-btn-primary">Try it free<ArrowRight size={16} /></Link>
            <Link to="/login" className="lv2-btn-ghost">Explore niches</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: Eye, l: "Real numbers", b: "Live YouTube data, no caches." },
            { icon: Activity, l: "Real patterns", b: "Decoded from 12k+ top channels." },
            { icon: Layers, l: "Real actions", b: "Exact line edits, not vibes." },
            { icon: Zap, l: "Real fast", b: "Full report in under 7 seconds." },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="p-5 rounded-2xl bg-white border border-[color:var(--lv2-hairline)]"
              >
                <Icon size={22} className="text-[color:var(--lv2-accent-deep)]" />
                <div className="mt-3 font-semibold text-[15px]">{c.l}</div>
                <div className="mt-1 text-[13px] text-[color:var(--lv2-ink-soft)]">{c.b}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Pricing                                                                 */
/* ────────────────────────────────────────────────────────────────────── */

const PRICING = [
  {
    name: "Free",
    price: "$0",
    sub: "Forever",
    feats: ["1 analysis / month", "Pre-Analysis (basic)", "Channel digests", "Public benchmarks"],
    cta: "Start free",
    popular: false,
    original: null,
    discount: null,
  },
  {
    name: "Creator",
    price: "$20",
    original: "$25",
    sub: "per month",
    feats: ["10 analyses / day", "All 4 tools unlocked", "Thumbnail testing", "Shadowban detector"],
    cta: "Start Creator",
    popular: true,
    discount: "Save $5 — 20% off",
  },
  {
    name: "Pro",
    price: "$50",
    original: "$100",
    sub: "per month",
    feats: ["25 analyses / day", "Everything in Creator", "Niche deep-dives", "Competitor tracking", "Priority support"],
    cta: "Go Pro",
    popular: false,
    discount: null,
  },
];

const PRICING_FEAT_LOCKED = "Public benchmarks";

function Pricing() {
  function renderPricingFeat(f: string, idx: number, arr: string[]) {
    const p = PRICING[Math.floor(idx / arr.length)]; // won't work, need proper scoping
  }

  return (
    <section className="lv2-section" id="pricing">
      <div className="text-center mb-14">
        <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[color:var(--lv2-accent-deep)]">Pricing</div>
        <h2 className="display mt-3" style={{ fontSize: "clamp(34px, 5vw, 64px)" }}>One price. Every tool.</h2>
        <p className="mt-4 text-[color:var(--lv2-ink-soft)] text-[16px] max-w-md mx-auto">
          No seats, no add-ons, no upsells. Just channel intelligence.
        </p>
      </div>
      <div className="lv2-container grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {PRICING.map((p) => {
          const lockedFeats = new Set(p.feats.filter(f => p.name === "Free" && f === PRICING_FEAT_LOCKED));
          return (
          <div key={p.name} className={`lv2-price ${p.popular ? "popular" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold tracking-wider uppercase label">{p.name}</div>
              {p.popular && <span className="text-[10.5px] font-bold px-2 py-1 rounded-full bg-[color:var(--lv2-accent)] text-black">POPULAR</span>}
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
            <Link
              to="/login"
              className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-semibold text-[14px] transition-all lv2-plan-btn ${p.popular ? "bg-[color:var(--lv2-accent)] text-black hover:bg-[#1de077]" : "bg-[color:var(--lv2-ink)] text-white hover:bg-[#1a1a22]"}`}
            >
              {p.cta}<ArrowRight size={15} />
            </Link>
            <ul className="mt-7 space-y-3">
              {p.feats.map(function(f) {
                const isLocked = p.name === "Free" && f === PRICING_FEAT_LOCKED;
                return (
                  <li key={f} className={"flex gap-2.5 text-[14px] feat" + (isLocked ? " opacity-60" : "")}>
                    {isLocked ? (
                      <span className="flex gap-2.5 items-center">
                        <Lock size={17} className="text-blue-400 shrink-0" />
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{f}</span>
                      </span>
                    ) : (
                      <span className="flex gap-2.5 items-center">
                        <CheckCircle2 size={17} className={p.popular ? "text-[color:var(--lv2-accent)] shrink-0" : "text-[color:var(--lv2-accent-deep)] shrink-0"} />
                        <span>{f}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* FAQ                                                                     */
/* ────────────────────────────────────────────────────────────────────── */

function Faq() {
  return (
    <section className="lv2-section" id="faq">
      <div className="lv2-container max-w-3xl">
        <div className="text-center mb-12">
          <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[color:var(--lv2-accent-deep)]">FAQ</div>
          <h2 className="display mt-3" style={{ fontSize: "clamp(34px, 5vw, 56px)" }}>Questions, answered.</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`q-${i}`} className="border-b border-[color:var(--lv2-hairline)]">
              <AccordionTrigger className="py-6 text-left text-[17px] font-semibold hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-[15px] text-[color:var(--lv2-ink-soft)] leading-relaxed pb-6">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Final CTA                                                               */
/* ────────────────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────────────── */
/* How It Works                                                            */
/* ────────────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    num: "01",
    icon: Link2,
    title: "Paste or Upload",
    desc: "Drop any YouTube channel URL or your draft video. No OAuth, no sign-up required — just paste and go.",
  },
  {
    num: "02",
    icon: Zap,
    title: "AI Decodes the Patterns",
    desc: "Hooks, pacing, thumbnail contrast, retention design, niche fit — analyzed against live YouTube data from your competitors.",
  },
  {
    num: "03",
    icon: FileText,
    title: "Get Your Report",
    desc: "Actionable scores, specific video citations, and an escape protocol if you're shadowbanned. Ready in ~7 seconds.",
  },
];

function HowItWorks() {
  return (
    <section className="lv2-section" id="how">
      <div className="text-center mb-16">
        <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[color:var(--lv2-accent-deep)]">How It Works</div>
        <h2 className="display mt-3" style={{ fontSize: "clamp(34px, 5vw, 64px)" }}>
          From channel to insight in 3 steps.
        </h2>
      </div>
      <div className="lv2-container max-w-5xl mx-auto grid md:grid-cols-3 gap-8 md:gap-12 items-start">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.num}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.12 }}
            className="lv2-step-card"
          >
            <div className="lv2-step-num">{s.num}</div>
            <div className="lv2-step-icon">
              <s.icon size={20} />
            </div>
            <h3 className="lv2-step-title">{s.title}</h3>
            <p className="lv2-step-desc">{s.desc}</p>
            {i < STEPS.length - 1 && <div className="lv2-step-arrow" aria-hidden />}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Testimonials                                                           */
/* ────────────────────────────────────────────────────────────────────── */

function Testimonials() {
  return (
    <section className="lv2-section" style={{ paddingTop: 60, paddingBottom: 80 }}>
      <div className="lv2-container">
        <div className="text-center mb-14">
          <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[color:var(--lv2-accent-deep)]">Social Proof</div>
          <h2 className="display mt-3" style={{ fontSize: "clamp(34px, 5vw, 64px)" }}>
            Loved by creators.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white border border-[color:var(--lv2-hairline)] rounded-[24px] p-6 transition-all hover:shadow-lg hover:border-[color:var(--lv2-hairline-strong)]"
            >
              <Quote size={20} className="text-[color:var(--lv2-accent)] mb-3 opacity-60" />
              <p className="text-[15px] text-[color:var(--lv2-ink)] leading-relaxed mb-5 italic">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[color:var(--lv2-accent)] to-[color:var(--lv2-violet)] flex items-center justify-center text-white font-bold text-sm">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="font-semibold text-[14px] text-[color:var(--lv2-ink)]">{t.name}</div>
                  <div className="text-[12px] text-[color:var(--lv2-ink-soft)]">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Trust Badges                                                            */
/* ────────────────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────────────── */
/* Proof Section — Predicted viral. It delivered.                        */
/* ────────────────────────────────────────────────────────────────────── */

function TiltCard({ children }: { children: ReactNode }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -12, y: x * 12 });
    setMousePos({ x: px, y: py });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setMousePos({ x: 50, y: 50 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="lv2-tilt-card"
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        "--mx": `${mousePos.x}%`,
        "--my": `${mousePos.y}%`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

function AnimatedCountUp({ value, suffix = "", decimals = 1 }: { value: number; suffix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    setCount(0);
    const end = value;
    const duration = 1500;
    const startTime = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(eased * end);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return <span ref={ref}>{count.toFixed(decimals)}{suffix}</span>;
}

function ProofSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const img1Scale = useTransform(scrollYProgress, [0.1, 0.35], [0.85, 1]);
  const img1Y = useTransform(scrollYProgress, [0.1, 0.35], [80, 0]);
  const img2Scale = useTransform(scrollYProgress, [0.35, 0.6], [0.85, 1]);
  const img2Y = useTransform(scrollYProgress, [0.35, 0.6], [80, 0]);

  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 4,
    size: Math.random() * 4 + 2,
  }));

  return (
    <section ref={sectionRef} className="lv2-section lv2-proof">
      <div className="text-center mb-3">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "backOut" }}
          className="lv2-proof-label"
        >
          Real Result
        </motion.span>
      </div>

      <div className="text-center mb-16 overflow-hidden relative">
        {/* Sparkle particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                background: p.id % 3 === 0 ? "var(--lv2-accent)" : p.id % 3 === 1 ? "var(--lv2-violet)" : "var(--lv2-amber)",
              }}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{
                opacity: [0, 0.9, 0],
                scale: [0, 2, 0],
                y: [0, -40],
              }}
              viewport={{ once: true }}
              transition={{
                duration: 2.5,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}
        </div>

        <h2 className="display relative z-10" style={{ fontSize: "clamp(44px, 8vw, 96px)" }}>
          <motion.span
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            whileInView={{ clipPath: "inset(0 0% 0 0)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
            className="inline-block mr-4"
          >
            Predicted viral.
          </motion.span>
          <motion.span
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            whileInView={{ clipPath: "inset(0 0% 0 0)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="inline-block lv2-rainbow-shift"
          >
            It delivered.
          </motion.span>
        </h2>
      </div>

      <div className="lv2-container max-w-4xl mx-auto space-y-24 md:space-y-32">
        {/* Image 1 — Prediction */}
        <motion.div
          style={{ scale: img1Scale, y: img1Y }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <a
            href="https://www.youtube.com/shorts/CXjmKrbL7gI"
            target="_blank"
            rel="noopener noreferrer"
            className="lv2-proof-pill"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff0000" className="shrink-0">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
            </svg>
            <span className="lv2-proof-pill-text">Normal skill VS The GOAT</span>
            <span className="lv2-proof-pill-ou">
              <AnimatedCountUp value={448.5} suffix="x" /> outlier
            </span>
          </a>
          <a
            href="https://www.youtube.com/shorts/CXjmKrbL7gI"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <TiltCard>
              <div className="lv2-proof-img-wrap">
                <img src="/testreal1.png" alt="Viraleo AI prediction" />
              </div>
            </TiltCard>
          </a>
        </motion.div>

        {/* Image 2 — Result */}
        <motion.div
          style={{ scale: img2Scale, y: img2Y }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <a
            href="https://www.youtube.com/shorts/Qqmp9ARj28g"
            target="_blank"
            rel="noopener noreferrer"
            className="lv2-proof-pill"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff0000" className="shrink-0">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
            </svg>
            <span className="lv2-proof-pill-text">Ranking The Best Unexpected Moment🚠</span>
            <span className="lv2-proof-pill-ou">
              <AnimatedCountUp value={69.28} suffix="x" /> outlier
            </span>
          </a>
          <a
            href="https://www.youtube.com/shorts/Qqmp9ARj28g"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <TiltCard>
              <div className="lv2-proof-img-wrap">
                <img src="/testreal2.png" alt="11 million real YouTube views" />
              </div>
            </TiltCard>
          </a>
        </motion.div>

      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="lv2-section" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <div className="lv2-container text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-[clamp(36px,6vw,80px)] font-extrabold text-[color:var(--lv2-ink)] leading-[1.05] tracking-[-0.04em] mb-6">
            Stop guessing.{" "}
            <span className="dominate">Start dominating.</span>
          </h2>
          <Link
            to="/login"
            className="lv2-btn-primary text-[18px] px-10 py-4"
          >
            Dominate Now
            <ArrowRight size={20} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Footer + Nav                                                            */
/* ────────────────────────────────────────────────────────────────────── */

export function Nav() {
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
        <a href="#how" className="l">Product</a>
        <a href="#pricing" className="l">Pricing</a>
        <a href="#faq" className="l">FAQ</a>
      </div>
      <Link to="/login" className="cta ml-1">
        Decode <ArrowRight size={scrolled ? 14 : 16} />
      </Link>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="lv2-section" style={{ paddingTop: 60, paddingBottom: 60 }}>
      <div className="lv2-rule mb-12" />
      <div className="lv2-container flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <ViraleoLogo size="sm" linkTo="/" />
        </div>
        <div className="text-[13px] text-[color:var(--lv2-ink-mute)]">
          © {new Date().getFullYear()} Viraleo. Built for creators who ship.
        </div>
        <div className="flex items-center gap-5 text-[13px] text-[color:var(--lv2-ink-soft)]">
          <Link to="/support" className="hover:text-[color:var(--lv2-ink)]">Support</Link>
          <Link to="/privacy-policy" className="hover:text-[color:var(--lv2-ink)]">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-[color:var(--lv2-ink)]">Terms of Service</Link>
          <Link to="/cookies" className="hover:text-[color:var(--lv2-ink)]">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Root                                                                    */
/* ────────────────────────────────────────────────────────────────────── */

export function LandingV2() {
  return (
    <main className="lv2">
      <Nav />
      <Hero />
      <ProductMock />
      <HowItWorks />
      <FeatureReel />
      <Metrics />
      <ChannelMarquee />
      <CompareSection />
      <Testimonials />
      <ProofSection />
      <WhySplit />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
