import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Zap,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  Check,
  Clock,
  User,
} from "lucide-react";
import { PLANS, type PlanTier } from "@/lib/plans";
import { usePlanDisplay, useUserState, assignPlan } from "@/lib/user-state";
import { getRecentActivities, formatTimestamp, getFeatureRoute } from "@/lib/activity";
import { getSettings, updateSettings, clearAllData, type UserSettings } from "@/lib/settings";
import { Link, useNavigate } from "@tanstack/react-router";

interface AccountPanelProps {
  open: boolean;
  onClose: () => void;
}

type PanelTab = "account" | "plan" | "settings";

export function AccountPanel({ open, onClose }: AccountPanelProps) {
  const navigate = useNavigate();
  const { refresh: refreshUserState } = useUserState();
  const { tier, label, credits, maxCredits, nextReset } = usePlanDisplay();
  const [tab, setTab] = useState<PanelTab>("account");
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
      onClose();
    }
  }

  function handleLogout() {
    clearAllData();
    navigate({ to: "/" });
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[380px] max-w-[90vw] bg-white border-l border-hairline shadow-2xl overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-hairline">
              <h2 className="font-bold text-[18px] text-ink">Account</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-2 transition">
                <X size={18} className="text-ink-soft" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-hairline">
              {[
                { key: "account" as PanelTab, icon: User, label: "Account" },
                { key: "plan" as PanelTab, icon: Zap, label: "Plan" },
                { key: "settings" as PanelTab, icon: Settings, label: "Settings" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-bold uppercase tracking-wider transition ${
                    tab === t.key
                      ? "text-emerald-600 border-b-2 border-emerald-500"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-5">
              {tab === "account" && (
                <>
                  {/* Plan badge + credits */}
                  <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-5">
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
                      <span className="text-[32px] font-black text-ink">{credits}</span>
                      <span className="text-[16px] font-bold text-ink-soft">/ {maxCredits}</span>
                      <span className="text-[12px] text-ink-soft ml-1">credits</span>
                    </div>
                    <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-ink-soft">Resets {nextReset}</p>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
                        Recent Activity
                      </h3>
                      <Link
                        to="/history"
                        onClick={onClose}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                      >
                        View all <ChevronRight size={12} />
                      </Link>
                    </div>
                    <div className="space-y-1">
                      {activities.length === 0 ? (
                        <p className="text-[12px] text-ink-soft py-3 text-center">
                          No activity yet
                        </p>
                      ) : (
                        activities.map((a) => (
                          <Link
                            key={a.id}
                            to={getFeatureRoute(a.feature)}
                            onClick={onClose}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-2 transition group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                              <Clock size={13} className="text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold text-ink truncate">
                                {a.label}
                              </p>
                              {a.target && (
                                <p className="text-[10px] text-ink-soft truncate">{a.target}</p>
                              )}
                            </div>
                            <span className="text-[10px] text-ink-soft shrink-0">
                              {formatTimestamp(a.timestamp)}
                            </span>
                            <ChevronRight
                              size={12}
                              className="text-ink-soft opacity-0 group-hover:opacity-100 transition shrink-0"
                            />
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {tab === "plan" && (
                <div className="space-y-3">
                  <p className="text-[12px] text-ink-soft">
                    Choose a plan. Credits reset on the 1st of each month.
                  </p>
                  {(["free", "creator", "pro"] as PlanTier[]).map((tier) => {
                    const p = PLANS[tier];
                    const selected = tier === tier;
                    return (
                      <button
                        key={tier}
                        onClick={() => handlePlanChange(tier)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition text-left ${
                          selected
                            ? "border-emerald-500 bg-emerald-50/50"
                            : "border-hairline bg-white hover:border-emerald-200"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selected ? "border-emerald-500" : "border-ink-soft"
                          }`}
                        >
                          {selected && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[14px] text-ink">{p.label}</span>
                            <span className="font-bold text-[14px] text-ink">{p.price}</span>
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

              {tab === "settings" && (
                <div className="space-y-5">
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
                      className="w-full px-3 py-2 rounded-xl border border-hairline text-[13px] font-medium text-ink bg-white focus:outline-none focus:border-emerald-400"
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
                          className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition ${
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
                          className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition ${
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
                  <div className="pt-4 border-t border-hairline">
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
