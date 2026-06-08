import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { ViraleoLogo } from "@/components/ViraleoLogo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Viraleo" },
      { name: "description", content: "Sign in to Viraleo with Google. Access AI-powered YouTube thumbnail testing, niche ranking, and channel analysis tools." },
      { property: "og:title", content: "Sign In — Viraleo" },
      { property: "og:description", content: "Sign in to Viraleo and unlock AI-powered YouTube channel intelligence." },
      { name: "twitter:title", content: "Sign In — Viraleo" },
      { name: "twitter:description", content: "Sign in to Viraleo with Google." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/login" }],
  }),
  component: LoginPage,
});

function googleAuthUrl(fromPartner: boolean) {
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
  const base = `https://accounts.google.com/o/oauth2/v2/auth?client_id=945597493055-boitht424pc7g0qtd6i8f4a5qn5td440.apps.googleusercontent.com&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&access_type=offline`;
  return fromPartner ? `${base}&state=partner` : base;
}

function LoginPage() {
  const search = useSearch({ from: Route.id, select: (s) => s as Record<string, string> });
  const fromPartner = search.from === "partner";
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  const handleGoogle = () => {
    setLoading(true);
    window.location.href = googleAuthUrl(fromPartner);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#f5f5f7] px-5 py-10 overflow-hidden">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 10%, rgba(48,209,88,0.18) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 85% 80%, rgba(0,122,255,0.10) 0%, transparent 55%),
              radial-gradient(ellipse 50% 40% at 50% 50%, rgba(255,255,255,0.6) 0%, transparent 80%),
              #f0f4f0
            `,
          }}
        />
        <div className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center">
        <div className="mb-5"
          style={{ animation: "fadeDown 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
        >
          <ViraleoLogo size="md" linkTo="" />
        </div>

        <div className="text-center mb-7"
          style={{ animation: "fadeDown 0.55s cubic-bezier(0.22,1,0.36,1) 0.05s both" }}
        >
          <h1 className="text-[clamp(26px,4vw,36px)] font-bold leading-[1.08] tracking-tight text-[#1d1d1f]"
            style={{ letterSpacing: "-1.2px" }}
          >
            {fromPartner ? (
              <>
                Print money<span className="bg-gradient-to-br from-[#30d158] to-[#25a244] bg-clip-text text-transparent">.</span>
              </>
            ) : (
              <>
                Your channel&apos;s viral potential<span className="bg-gradient-to-br from-[#30d158] to-[#25a244] bg-clip-text text-transparent">.</span>
              </>
            )}
          </h1>
          <p className="mt-2 text-[15px] text-[#6e6e73] font-normal" style={{ letterSpacing: "-0.1px" }}>
            {fromPartner ? "Earn 50% commission on every referral. Partner program." : "The AI engine behind the videos you wish you made."}
          </p>
        </div>

        <div className="w-full rounded-[24px] border border-white/70 px-8 py-8 pb-7"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(28px) saturate(1.8)",
            WebkitBackdropFilter: "blur(28px) saturate(1.8)",
            boxShadow: "0 2px 0 rgba(255,255,255,0.9) inset, 0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
            animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both",
          }}
        >
          <div className="flex bg-black/10 rounded-[10px] p-[3px] mb-[26px]">
            <button
              onClick={() => setTab("signin")}
              className={`flex-1 py-[7px] rounded-[8px] text-[13.5px] font-medium transition-all duration-200 cursor-pointer`}
              style={{
                letterSpacing: "-0.1px",
                background: tab === "signin" ? "#fff" : "transparent",
                color: tab === "signin" ? "#1d1d1f" : "#6e6e73",
                boxShadow: tab === "signin" ? "0 1px 4px rgba(0,0,0,0.1), 0 0.5px 1px rgba(0,0,0,0.06)" : "none",
                fontFamily: "inherit",
                border: "none",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 py-[7px] rounded-[8px] text-[13.5px] font-medium transition-all duration-200 cursor-pointer`}
              style={{
                letterSpacing: "-0.1px",
                background: tab === "signup" ? "#fff" : "transparent",
                color: tab === "signup" ? "#1d1d1f" : "#6e6e73",
                boxShadow: tab === "signup" ? "0 1px 4px rgba(0,0,0,0.1), 0 0.5px 1px rgba(0,0,0,0.06)" : "none",
                fontFamily: "inherit",
                border: "none",
              }}
            >
              Sign Up
            </button>
          </div>

          <div className="mb-[18px]">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-[7px] py-[10px] px-3 rounded-[12px] text-[13.5px] font-medium text-[#1d1d1f] cursor-pointer transition-all duration-150 border border-black/10"
              style={{
                background: "rgba(255,255,255,0.8)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.09)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.8)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = "none"; }}
            >
              {loading ? (
                <svg className="animate-spin h-[15px] w-[15px]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
              <span>{loading ? "Redirecting..." : "Continue with Google"}</span>
            </button>
          </div>

          <div className="flex items-center gap-[10px] mb-[18px]">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-[12px] text-[#6e6e73]" style={{ letterSpacing: "0.1px" }}>or</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          {tab === "signin" ? (
            <SigninContent loading={loading} onGoogle={handleGoogle} />
          ) : (
            <SignupContent loading={loading} onGoogle={handleGoogle} />
          )}
        </div>

        <p className="mt-[18px] text-[13px] text-[#6e6e73] text-center"
          style={{ animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both" }}
        >
          {tab === "signin" ? (
            <>Don&apos;t have an account? <button onClick={() => setTab("signup")} className="text-[#0071e3] font-medium bg-transparent border-none cursor-pointer text-[13px] hover:underline" style={{ fontFamily: "inherit" }}>Sign up free</button></>
          ) : (
            <>Already have an account? <button onClick={() => setTab("signin")} className="text-[#0071e3] font-medium bg-transparent border-none cursor-pointer text-[13px] hover:underline" style={{ fontFamily: "inherit" }}>Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}

function SigninContent({ loading, onGoogle }: { loading: boolean; onGoogle: () => void }) {
  return (
    <>
      <div className="mb-3">
        <label className="block text-[12px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-[5px]">Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full px-[13px] py-[11px] text-[15px] text-[#1d1d1f] rounded-[11px] outline-none transition-all duration-180"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1.5px solid rgba(0,0,0,0.12)",
            fontFamily: "inherit",
            WebkitFontSmoothing: "antialiased",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#30d158"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(48,209,88,0.15)"; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.12)"; e.target.style.background = "rgba(255,255,255,0.7)"; e.target.style.boxShadow = "none"; }}
        />
      </div>

      <div className="mb-[22px]">
        <label className="block text-[12px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-[5px]">Password</label>
        <input
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          className="w-full px-[13px] py-[11px] text-[15px] text-[#1d1d1f] rounded-[11px] outline-none transition-all duration-180"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1.5px solid rgba(0,0,0,0.12)",
            fontFamily: "inherit",
            WebkitFontSmoothing: "antialiased",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#30d158"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(48,209,88,0.15)"; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.12)"; e.target.style.background = "rgba(255,255,255,0.7)"; e.target.style.boxShadow = "none"; }}
        />
      </div>

      <AppleCta onClick={onGoogle} label="Sign In" loading={loading} />

      <p className="mt-[14px] text-[11.5px] text-[#6e6e73] text-center leading-[1.6]" style={{ letterSpacing: "-0.1px" }}>
        By signing in you agree to our <a href="/terms" className="text-[#0071e3] no-underline hover:underline">Terms</a> &amp; <a href="/privacy-policy" className="text-[#0071e3] no-underline hover:underline">Privacy Policy</a>.
      </p>
    </>
  );
}

function SignupContent({ loading, onGoogle }: { loading: boolean; onGoogle: () => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-[10px] mb-3">
        <div>
          <label className="block text-[12px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-[5px]">First name</label>
          <input
            type="text"
            placeholder="Alex"
            autoComplete="given-name"
            className="w-full px-[13px] py-[11px] text-[15px] text-[#1d1d1f] rounded-[11px] outline-none transition-all duration-180"
            style={{
              background: "rgba(255,255,255,0.7)",
              border: "1.5px solid rgba(0,0,0,0.12)",
              fontFamily: "inherit",
              WebkitFontSmoothing: "antialiased",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#30d158"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(48,209,88,0.15)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.12)"; e.target.style.background = "rgba(255,255,255,0.7)"; e.target.style.boxShadow = "none"; }}
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-[5px]">Last name</label>
          <input
            type="text"
            placeholder="Rivera"
            autoComplete="family-name"
            className="w-full px-[13px] py-[11px] text-[15px] text-[#1d1d1f] rounded-[11px] outline-none transition-all duration-180"
            style={{
              background: "rgba(255,255,255,0.7)",
              border: "1.5px solid rgba(0,0,0,0.12)",
              fontFamily: "inherit",
              WebkitFontSmoothing: "antialiased",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#30d158"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(48,209,88,0.15)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.12)"; e.target.style.background = "rgba(255,255,255,0.7)"; e.target.style.boxShadow = "none"; }}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-[12px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-[5px]">Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full px-[13px] py-[11px] text-[15px] text-[#1d1d1f] rounded-[11px] outline-none transition-all duration-180"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1.5px solid rgba(0,0,0,0.12)",
            fontFamily: "inherit",
            WebkitFontSmoothing: "antialiased",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#30d158"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(48,209,88,0.15)"; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.12)"; e.target.style.background = "rgba(255,255,255,0.7)"; e.target.style.boxShadow = "none"; }}
        />
      </div>

      <div className="mb-[22px]">
        <label className="block text-[12px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-[5px]">Password</label>
        <input
          type="password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          className="w-full px-[13px] py-[11px] text-[15px] text-[#1d1d1f] rounded-[11px] outline-none transition-all duration-180"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1.5px solid rgba(0,0,0,0.12)",
            fontFamily: "inherit",
            WebkitFontSmoothing: "antialiased",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#30d158"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(48,209,88,0.15)"; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.12)"; e.target.style.background = "rgba(255,255,255,0.7)"; e.target.style.boxShadow = "none"; }}
        />
      </div>

      <AppleCta onClick={onGoogle} label="Create Account" loading={loading} />

      <p className="mt-[14px] text-[11.5px] text-[#6e6e73] text-center leading-[1.6]" style={{ letterSpacing: "-0.1px" }}>
        By creating an account you agree to our <a href="/terms" className="text-[#0071e3] no-underline hover:underline">Terms of Service</a> and <a href="/privacy-policy" className="text-[#0071e3] no-underline hover:underline">Privacy Policy</a>.
      </p>
    </>
  );
}

function AppleCta({ onClick, label, loading }: { onClick: () => void; label: string; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full relative overflow-hidden flex items-center justify-center gap-[7px] py-[13px] rounded-[13px] text-[15px] font-semibold text-white cursor-pointer transition-all duration-200 border-none"
      style={{
        fontFamily: "inherit",
        letterSpacing: "-0.2px",
        background: "linear-gradient(180deg, #3dda6b 0%, #25a244 100%)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.25) inset, 0 4px 16px rgba(48,209,88,0.4), 0 1px 3px rgba(0,0,0,0.15)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(180deg, #45e074 0%, #28b34a 100%)"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,0.25) inset, 0 6px 22px rgba(48,209,88,0.45), 0 2px 6px rgba(0,0,0,0.15)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(180deg, #3dda6b 0%, #25a244 100%)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,0.25) inset, 0 4px 16px rgba(48,209,88,0.4), 0 1px 3px rgba(0,0,0,0.15)"; }}
    >
      <span className="absolute top-0 left-0 right-0 h-1/2 rounded-[13px_13px_0_0] pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)" }}
      />
      {loading ? (
        <svg className="animate-spin h-[17px] w-[17px]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <>{label} <span className="inline-block" style={{ transition: "transform 0.2s" }}>→</span></>
      )}
    </button>
  );
}
