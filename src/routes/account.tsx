import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Zap,
  Settings,
  LogOut,
  ChevronRight,
  Clock,
  User,
  BarChart3,
} from "lucide-react";
import { PLANS, type PlanTier } from "@/lib/plans";
import { usePlanDisplay, useUserState, assignPlan } from "@/lib/user-state";
import { getRecentActivities, formatTimestamp, getFeatureRoute } from "@/lib/activity";
import { getSettings, updateSettings, clearAllData, type UserSettings } from "@/lib/settings";
import { getUsageWeek, getFeatureBreakdown } from "@/lib/usage";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — Viraleo" },
      {
        name: "description",
        content: "Manage your Viraleo account, subscription plan, credits, and settings.",
      },
      { property: "og:title", content: "Account — Viraleo" },
      { property: "og:description", content: "Manage your Viraleo account and subscription." },
      { name: "twitter:title", content: "Account — Viraleo" },
      { name: "twitter:description", content: "Manage your account." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/account" }],
  }),
  component: AccountPage,
});

type Tab = "account" | "usage" | "plan" | "settings";
const tabs: { key: Tab; icon: typeof User; label: string }[] = [
  { key: "account", icon: User, label: "Account" },
  { key: "usage", icon: BarChart3, label: "Usage" },
  { key: "plan", icon: Zap, label: "Plan" },
  { key: "settings", icon: Settings, label: "Settings" },
];

function AccountPage() {
  const navigate = useNavigate();
  const { refresh: refreshUserState } = useUserState();
  const { tier, label, credits, maxCredits, nextReset } = usePlanDisplay();
  const [tab, setTab] = useState<Tab>("account");
  const [settings, setSettingsState] = useState(getSettings());
  const [activities, setActivities] = useState(getRecentActivities(5));

  const pct = maxCredits > 0 ? Math.round((credits / maxCredits) * 100) : 0;

  function refresh() {
    refreshUserState();
    setSettingsState(getSettings());
    setActivities(getRecentActivities(5));
  }

  async function handlePlanChange(planTier: PlanTier) {
    if (planTier === "free") {
      await assignPlan({ data: { tier: planTier } });
      refresh();
    } else {
      navigate({ to: "/select-plan" });
    }
  }

  function handleLogout() {
    clearAllData();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-white text-ink font-text">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 rounded-xl hover:bg-surface-2 transition">
            <ArrowLeft size={18} className="text-ink-soft" />
          </Link>
          <div>
            <h1 className="font-display text-[26px] font-black text-ink">Account</h1>
            <p className="text-[13px] text-ink-soft mt-0.5">
              Manage your plan, credits, and settings
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-2xl bg-surface-2 p-1 mb-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition ${
                tab === t.key
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* ==================== ACCOUNT TAB ==================== */}
          {tab === "account" && (
            <>
              {/* Plan badge + credits */}
              <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
                    Current Plan
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      tier === "free"
                        ? "bg-amber-100 text-amber-700"
                        : tier === "creator"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-violet-100 text-violet-700"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[40px] font-black text-ink">{credits}</span>
                  <span className="text-[20px] font-bold text-ink-soft">/ {maxCredits}</span>
                  <span className="text-[13px] text-ink-soft ml-1">credits</span>
                </div>
                <div className="w-full h-2.5 bg-emerald-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[12px] text-ink-soft">Resets {nextReset}</p>
              </div>

              {/* Recent Activity */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
                    Recent Activity
                  </h3>
                  <Link
                    to="/history"
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                  >
                    View all <ChevronRight size={12} />
                  </Link>
                </div>
                <div className="space-y-1">
                  {activities.length === 0 ? (
                    <p className="text-[13px] text-ink-soft py-6 text-center">No activity yet</p>
                  ) : (
                    activities.map((a) => (
                      <Link
                        key={a.id}
                        to={getFeatureRoute(a.feature)}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-2 transition group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                          <Clock size={14} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-ink truncate">{a.label}</p>
                          {a.target && (
                            <p className="text-[11px] text-ink-soft truncate">{a.target}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-ink-soft shrink-0">
                          {formatTimestamp(a.timestamp)}
                        </span>
                        <ChevronRight
                          size={13}
                          className="text-ink-soft opacity-0 group-hover:opacity-100 transition shrink-0"
                        />
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* ==================== USAGE TAB ==================== */}
          {tab === "usage" && (
            <>
              {/* 7-day bar chart */}
              <div className="bg-white border border-hairline rounded-2xl p-5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-soft mb-4">
                  Last 7 Days
                </h3>
                <div className="flex items-end gap-1.5 h-28">
                  {(() => {
                    const week = getUsageWeek();
                    const maxVal = Math.max(...week.map((d) => d.total), 1);
                    return week.map((day, i) => {
                      const pct = (day.total / maxVal) * 100;
                      const label = new Date(day.date).toLocaleDateString("en-US", {
                        weekday: "short",
                      });
                      const isToday = i === 6;
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] text-ink-soft font-medium">{day.total}</span>
                          <div
                            className="w-full rounded-md bg-surface-2 relative overflow-hidden"
                            style={{ height: "80px" }}
                          >
                            <div
                              className="absolute bottom-0 left-0 right-0 rounded-md bg-emerald-400 transition-all"
                              style={{ height: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`text-[10px] ${isToday ? "text-emerald-600 font-bold" : "text-ink-soft"}`}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Feature breakdown */}
              <div className="bg-white border border-hairline rounded-2xl p-5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-soft mb-4">
                  By Feature (7 days)
                </h3>
                <div className="space-y-3">
                  {getFeatureBreakdown().map((f) => (
                    <div key={f.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium text-ink">{f.label}</span>
                        <span className="text-[13px] font-bold text-ink">{f.value}</span>
                      </div>
                      <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${f.color} transition-all`}
                          style={{
                            width: `${Math.min(100, (f.value / Math.max(...getFeatureBreakdown().map((x) => x.value), 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credits usage this month */}
              <div className="bg-white border border-hairline rounded-2xl p-5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-soft mb-2">
                  Credits This Month
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-black text-ink">{credits}</span>
                  <span className="text-[16px] font-bold text-ink-soft">
                    / {maxCredits} used today
                  </span>
                </div>
                <p className="text-[12px] text-ink-soft mt-1">Resets {nextReset}</p>
              </div>
            </>
          )}

          {/* ==================== PLAN TAB ==================== */}
          {tab === "plan" && (
            <div className="space-y-3">
              <p className="text-[13px] text-ink-soft">
                Choose a plan. Credits reset on the 1st of each month.
              </p>
              {(["free", "creator", "pro"] as PlanTier[]).map((tier) => {
                const p = PLANS[tier];
                const selected = tier === tier;
                return (
                  <button
                    key={tier}
                    onClick={() => handlePlanChange(tier)}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition text-left ${
                      selected
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-hairline bg-white hover:border-emerald-200"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selected ? "border-emerald-500" : "border-ink-soft"
                      }`}
                    >
                      {selected && <div className="w-3 h-3 rounded-full bg-emerald-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[15px] text-ink">{p.label}</span>
                        <span className="font-bold text-[15px] text-ink">{p.price}</span>
                      </div>
                      <p className="text-[12px] text-ink-soft mt-0.5">
                        {p.creditsPerMonth} credits / month
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ==================== SETTINGS TAB ==================== */}
          {tab === "settings" && (
            <div className="max-w-md space-y-6">
              {/* Display Name */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-ink-soft block mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={settings.displayName}
                  onChange={(e) => {
                    updateSettings({ displayName: e.target.value });
                    setSettingsState(getSettings());
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-hairline text-[14px] font-medium text-ink bg-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Default Format */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-ink-soft block mb-1.5">
                  Default Format
                </label>
                <div className="flex gap-2">
                  {(["short", "long"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        updateSettings({ defaultFormat: f });
                        setSettingsState(getSettings());
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition ${
                        settings.defaultFormat === f
                          ? "bg-emerald-500 text-white"
                          : "bg-surface-2 text-ink-soft hover:text-ink"
                      }`}
                    >
                      {f === "short" ? "Shorts" : "Long-form"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Mode */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-ink-soft block mb-1.5">
                  Sidebar
                </label>
                <div className="flex gap-2">
                  {(["auto-hide", "expanded"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        updateSettings({ sidebarMode: m });
                        setSettingsState(getSettings());
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition ${
                        settings.sidebarMode === m
                          ? "bg-emerald-500 text-white"
                          : "bg-surface-2 text-ink-soft hover:text-ink"
                      }`}
                    >
                      {m === "auto-hide" ? "Auto-hide" : "Expanded"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logout */}
              <div className="pt-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 text-[13px] font-bold hover:bg-red-50 transition"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
