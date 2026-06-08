import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getSessionFromDocument, clearSessionCookie, type SessionPayload } from "@/lib/auth/session";
import { clearPlanAndCredits, setPlan, type PlanTier } from "@/lib/credits";
import { toast, Toaster } from "sonner";

const fetchUserPlanFromKv = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const { getUserPlan } = await import("@/lib/user-plan");
    const stored = await getUserPlan(data.email);
    return stored?.tier || null;
  });

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center">
        <div className="mb-8">
          <span className="text-[120px] font-black text-ink/10 leading-none select-none">404</span>
        </div>
        <h1 className="text-2xl font-bold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-ink-soft">
          This page doesn't exist or has been moved. Try one of these instead.
        </p>
        <div className="mt-8 flex flex-col gap-2">
          <Link to="/" className="rounded-xl bg-emerald-500 text-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-600 transition">Go home</Link>
          <div className="flex gap-2 justify-center mt-2">
            <Link to="/thumbnail-test" search={{} as any} className="text-xs text-ink-soft hover:text-ink underline underline-offset-2">Thumbnail Test</Link>
            <Link to="/niche-ranker" search={{} as any} className="text-xs text-ink-soft hover:text-ink underline underline-offset-2">Niche Ranker</Link>
            <Link to="/shadowban-detector" search={{} as any} className="text-xs text-ink-soft hover:text-ink underline underline-offset-2">Shadowban Detector</Link>
          </div>
          <div className="flex gap-2 justify-center">
            <Link to="/pre-analysis" search={{} as any} className="text-xs text-ink-soft hover:text-ink underline underline-offset-2">Pre-Analysis</Link>
            <Link to="/select-plan" className="text-xs text-ink-soft hover:text-ink underline underline-offset-2">Pricing</Link>
            <Link to="/faq" className="text-xs text-ink-soft hover:text-ink underline underline-offset-2">FAQ</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : String(Date.now()).slice(-6);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center">
        <div className="mb-6">
          <span className="text-[100px] font-black text-ink/10 leading-none select-none">!</span>
        </div>
        <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-soft">
          An unexpected error occurred. Our team has been notified.
        </p>
        {id && <p className="mt-1 text-[11px] text-ink-soft/50 font-mono">Error ID: {id}</p>}
        <div className="mt-8 flex flex-col gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-xl bg-emerald-500 text-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-600 transition"
          >
            Try again
          </button>
          <a href="/" className="text-xs text-ink-soft hover:text-ink underline underline-offset-2">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Viraleo — YouTube Channel Intelligence, decoded" },
      { name: "description", content: "Analyze any YouTube channel and unlock viral patterns, hooks, thumbnails, and structure. AI-powered thumbnail testing, niche ranking, and shadowban detection." },
      { property: "og:title", content: "Viraleo — YouTube Channel Intelligence, decoded" },
      { property: "og:description", content: "Analyze any YouTube channel and unlock viral patterns, hooks, thumbnails, and structure. AI-powered thumbnail testing, niche ranking, and shadowban detection." },
      { property: "og:image", content: "https://viraleo.pro/og-image.png" },
      { property: "og:url", content: "https://viraleo.pro" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Viraleo" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Viraleo — YouTube Channel Intelligence, decoded" },
      { name: "twitter:description", content: "Analyze any YouTube channel and unlock viral patterns, hooks, thumbnails, and structure." },
      { name: "twitter:image", content: "https://viraleo.pro/og-image.png" },
      { name: "twitter:site", content: "@viraleo" },
      { name: "robots", content: "index, follow" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/vi-logo.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/vi-logo.png" },
      { rel: "canonical", href: "https://viraleo.pro" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script type="application/ld+json" suppressHydrationWarning>{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Viraleo",
          url: "https://viraleo.pro",
          description: "AI-powered YouTube channel intelligence — thumbnail testing, niche ranking, shadowban detection, and pre-upload audit.",
          applicationCategory: "Multimedia",
          operatingSystem: "All",
          browserRequirements: "Requires JavaScript",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        })}</script>
      </head>
      <body>
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

import { ViraleoLogo } from "@/components/ViraleoLogo";

function BrandMark() {
  return (
    <div className="mb-6 flex justify-center">
      <ViraleoLogo linkTo="/pre-analysis" size="xl" showText={false} />
    </div>
  );
}
import { ChevronRight, ImageIcon, Search, Sparkles, ShieldAlert, Zap, User, Clock, History } from "lucide-react";
import { channelSearchFromIntel } from "@/lib/channel-session";
import { getCredits, getMaxCredits } from "@/lib/credits";
import { getRecentActivities, getFeatureRoute, deleteActivity, restoreActivity, type ActivityEntry } from "@/lib/activity";

function useSession() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const s = getSessionFromDocument();
    setSession(s);
    if (s?.email) {
      // Sync plan from KV on initial load
      fetchUserPlanFromKv({ data: { email: s.email } }).then((tier) => {
        if (tier === "creator" || tier === "pro") {
          setPlan(tier as PlanTier);
          localStorage.setItem("viraleo:plan-source", "paid");
          localStorage.setItem("viraleo:plan-selected", "true");
        }
      }).catch(() => {});
    }
    setLoaded(true);
  }, []);
  const signOut = () => {
    document.cookie = clearSessionCookie();
    clearPlanAndCredits();
    setSession(null);
    // Hard navigate to home so no protected page content remains in view
    if (typeof window !== "undefined") window.location.href = "/";
  };
  return { session, loaded, signOut };
}

function CreditsDisplay() {
  const [credits, setCredits] = useState(getCredits());
  const maxCredits = getMaxCredits();
  // Refresh credits when the window regains focus (after analysis completes)
  useEffect(() => {
    const refresh = () => setCredits(getCredits());
    window.addEventListener("focus", refresh);
    // Also poll every 2s in case user stays on page
    const id = setInterval(refresh, 2000);
    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(id);
    };
  }, []);
  return (
    <span>{credits}/{maxCredits} credits</span>
  );
}

function RecentActivityList() {
  const [items, setItems] = useState(getRecentActivities(5));
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Refresh on route changes so after an analysis the list updates
  useEffect(() => {
    setItems(getRecentActivities(5));
  }, [pathname]);

  function handleDelete(id: string, entry: ActivityEntry) {
    const deleted = deleteActivity(id);
    if (!deleted) return;
    setItems(prev => prev.filter((a) => a.id !== id));
    toast("Deleted", {
      description: `"${deleted.label}" removed`,
      action: {
        label: "Undo",
        onClick: () => {
          restoreActivity(deleted);
          setItems(prev => {
            const next = [...prev];
            next.unshift(deleted);
            return next;
          });
        },
      },
      duration: 4000,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-1" onMouseEnter={() => setItems(getRecentActivities(5))}>
      <div className="beautiful-sidebar-item !pb-1 !pt-2 !cursor-default hover:!bg-transparent hover:!shadow-none hover:!translate-y-0">
        <Clock size={20} className="icon" />
        <span className="label text-[10px] font-bold uppercase tracking-widest text-ink-soft">Recent</span>
      </div>
      {items.map((a) => (
        <div key={a.id} className="group relative">
          <Link
            to={getFeatureRoute(a.feature)}
            search={{ activityId: a.id }}
            className="beautiful-sidebar-item !py-1.5"
          >
            <div className="w-5 h-5 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <span className="label text-[11px] font-medium text-ink truncate">{a.label}</span>
          </Link>
          <button
            onClick={(e) => { e.preventDefault(); handleDelete(a.id, a); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 size-5 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 transition-all"
            title="Delete"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      ))}
      <Link
        to="/history"
        className="beautiful-sidebar-item !py-1.5"
      >
        <History size={20} className="icon" />
        <span className="label text-[10px] font-bold text-emerald-600">View all</span>
      </Link>
    </div>
  );
}

function RootSidebar({ session, signOut }: { session: SessionPayload | null; signOut: () => void }) {
  const channelSearch = channelSearchFromIntel();
  return (
    <aside className="beautiful-sidebar">
      <div className="beautiful-sidebar-title">
        Intelligence Suite
      </div>

      <Link to="/pre-analysis" search={{ ...channelSearch, activityId: undefined }} className="beautiful-sidebar-item">
        <Search size={20} className="icon" />
        <span className="label">Pre-Analysis</span>
        <ChevronRight size={15} className="chevron" />
      </Link>

      <Link to="/thumbnail-test" search={{ ...channelSearch, activityId: undefined }} className="beautiful-sidebar-item">
        <ImageIcon size={20} className="icon" />
        <span className="label">Thumbnail Test</span>
        <ChevronRight size={15} className="chevron" />
      </Link>

      <Link to="/niche-ranker" search={{ ...channelSearch, activityId: undefined }} className="beautiful-sidebar-item">
        <Sparkles size={20} className="icon" />
        <span className="label">Niche Ranker</span>
        <ChevronRight size={15} className="chevron" />
      </Link>

      <Link to="/shadowban-detector" search={{ ...channelSearch, activityId: undefined }} className="beautiful-sidebar-item">
        <ShieldAlert size={20} className="icon" />
        <span className="label">Shadowban Detector</span>
        <ChevronRight size={15} className="chevron" />
      </Link>

      <Link to="/history" className="beautiful-sidebar-item">
        <History size={20} className="icon" />
        <span className="label">History</span>
        <ChevronRight size={15} className="chevron" />
      </Link>

      <RecentActivityList />

      <div className="mt-auto" />

      {session ? (
        <>
          <Link to="/account" className="beautiful-sidebar-item border-t border-hairline pt-3 mt-1">
            <User size={20} className="icon" />
            <span className="label flex items-center gap-1.5">
              <Zap size={13} className="fill-emerald-500 text-emerald-500" />
              <CreditsDisplay />
            </span>
          </Link>
          <Link to="/" onClick={(e) => { e.preventDefault(); signOut(); }} className="beautiful-sidebar-item border-t border-hairline pt-3 mt-1 !text-ink-soft hover:!text-red-600 hover:!bg-red-50 hover:!border-red-100 hover:!shadow-none hover:!translate-y-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span className="label">Sign out</span>
          </Link>
        </>
      ) : (
        <Link to="/login" className="beautiful-sidebar-item border-t border-hairline pt-3 mt-1">
          <User size={20} className="icon" />
          <span className="label">Sign in</span>
        </Link>
      )}
    </aside>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fullWidthRoutes = ["/", "/partner-program", "/partner/dashboard", "/admin/payouts"];
  const isFullWidth = fullWidthRoutes.includes(pathname);
  const { session, loaded, signOut } = useSession();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Determine if current path is public before any rendering
  const publicPaths = ["/", "/login", "/auth/", "/select-plan", "/partner-program", "/ref/", "/blog", "/faq", "/privacy-policy", "/terms", "/cookies", "/support"];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!loaded) return;
    if (!isPublicPath && !session) {
      navigate({ to: "/login" });
    }
  }, [loaded, session, pathname, isPublicPath]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // SECURITY: Block render entirely when user is unauthenticated on a protected route.
  // This eliminates the "flash of dashboard" where tools show briefly before redirect.
  if (!loaded && !isPublicPath) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="flex min-h-screen items-center justify-center bg-surface">
          <div className="text-center">
            <div className="mx-auto size-10 rounded-full border-2 border-ink/10 border-t-ink animate-spin" />
          </div>
        </div>
      </QueryClientProvider>
    );
  }

  if (loaded && !isPublicPath && !session) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {isFullWidth ? (
        <Outlet />
      ) : (
        <div className="flex w-full min-h-screen">
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/30 z-40 lg:hidden animate-[fadeIn_.2s_ease]"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}
          <div className={`${mobileSidebarOpen ? 'open' : ''} beautiful-sidebar lg:!translate-x-0`}>
            <RootSidebar session={session} signOut={signOut} />
          </div>
          <div className="flex-1 max-lg:ml-0 ml-[68px] relative">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="fixed top-3 left-3 z-30 lg:hidden size-9 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-md border border-hairline shadow-sm hover:bg-white transition"
              aria-label="Toggle navigation"
            >
              {mobileSidebarOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              )}
            </button>
            <Outlet />
          </div>
        </div>
      )}
    </QueryClientProvider>
  );
}
