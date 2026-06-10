import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Search, ImageIcon, Sparkles, ShieldAlert, Clock, Trash2 } from "lucide-react";
import {
  getAllActivities,
  clearActivities,
  deleteActivity,
  restoreActivity,
  formatTimestamp,
  getFeatureRoute,
  type ActivityEntry,
} from "@/lib/activity";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Recent History — Viraleo" },
      {
        name: "description",
        content:
          "View your Viraleo analysis history. Thumbnail tests, niche rankings, shadowban checks, and pre-upload audits.",
      },
      { property: "og:title", content: "Recent History — Viraleo" },
      { property: "og:description", content: "Your Viraleo analysis history." },
      { name: "twitter:title", content: "Recent History — Viraleo" },
      { name: "twitter:description", content: "Your analysis history." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/history" }],
  }),
  component: HistoryPage,
});

const FEATURE_ICONS: Record<ActivityEntry["feature"], typeof Search> = {
  "pre-analysis": Search,
  "thumbnail-test": ImageIcon,
  "niche-ranker": Sparkles,
  "shadowban-detector": ShieldAlert,
};

const FEATURE_LABELS: Record<ActivityEntry["feature"], string> = {
  "pre-analysis": "Pre-Analysis",
  "thumbnail-test": "Thumbnail Test",
  "niche-ranker": "Niche Ranker",
  "shadowban-detector": "Shadowban Detector",
};

function HistoryPage() {
  const [activities, setActivities] = useState(getAllActivities());
  const [filter, setFilter] = useState<"all" | ActivityEntry["feature"]>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = filter === "all" ? activities : activities.filter((a) => a.feature === filter);

  const allFilteredSelected = filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id));

  function handleClear() {
    clearActivities();
    setActivities([]);
    setSelectedIds(new Set());
  }

  function handleDelete(id: string, entry: ActivityEntry) {
    const deleted = deleteActivity(id);
    if (!deleted) return;
    setActivities((prev) => prev.filter((x) => x.id !== id));
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    toast("Deleted", {
      description: `"${deleted.label}" removed`,
      action: {
        label: "Undo",
        onClick: () => {
          restoreActivity(deleted);
          setActivities((prev) => {
            const next = [...prev];
            next.unshift(deleted);
            return next;
          });
        },
      },
      duration: 4000,
    });
  }

  function handleDeleteSelected() {
    const deleted: ActivityEntry[] = [];
    for (const id of selectedIds) {
      const d = deleteActivity(id);
      if (d) deleted.push(d);
    }
    setActivities((prev) => prev.filter((x) => !selectedIds.has(x.id)));
    setSelectedIds(new Set());
    if (deleted.length === 1) {
      toast("Deleted", {
        description: `"${deleted[0].label}" removed`,
        action: {
          label: "Undo",
          onClick: () => {
            restoreActivity(deleted[0]);
            setActivities((prev) => {
              const next = [...prev];
              next.unshift(deleted[0]);
              return next;
            });
          },
        },
        duration: 4000,
      });
    } else {
      toast(`Deleted ${deleted.length} items`);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a) => a.id)));
    }
  }

  function handleSingleDelete(e: React.MouseEvent, a: ActivityEntry) {
    e.preventDefault();
    e.stopPropagation();
    handleDelete(a.id, a);
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="min-h-screen bg-white text-ink font-text">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 rounded-xl hover:bg-surface-2 transition">
              <ArrowLeft size={18} className="text-ink-soft" />
            </Link>
            <div>
              <h1 className="font-display text-[26px] font-black text-ink">Recent History</h1>
              <p className="text-[13px] text-ink-soft mt-0.5">
                All your activity across Viraleo features
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 ? (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-[11px] font-bold text-red-600 hover:bg-red-100 transition"
              >
                <Trash2 size={13} />
                Delete selected ({selectedCount})
              </button>
            ) : activities.length > 0 ? (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-hairline text-[11px] font-bold text-ink-soft hover:text-red-600 hover:border-red-200 transition"
              >
                <Trash2 size={13} />
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(
            ["all", "pre-analysis", "thumbnail-test", "niche-ranker", "shadowban-detector"] as const
          ).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition ${
                filter === f
                  ? "bg-emerald-500 text-white"
                  : "bg-surface-2 text-ink-soft hover:text-ink border border-hairline"
              }`}
            >
              {f === "all" ? "All" : FEATURE_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Activity list */}
        <div className="space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Clock size={32} className="mx-auto text-ink-soft/40 mb-3" />
              <p className="text-[14px] font-semibold text-ink-soft">No activity yet</p>
              <p className="text-[12px] text-ink-soft mt-1">Your usage will appear here</p>
            </div>
          ) : (
            <>
              {/* Select all row */}
              <div className="flex items-center gap-3 px-3.5 py-2 text-[11px] font-medium text-ink-soft">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-hairline"
                  />
                  <span>{allFilteredSelected ? "Deselect all" : "Select all"}</span>
                </label>
                {selectedCount > 0 && <span className="text-ink">{selectedCount} selected</span>}
              </div>

              {filtered.map((a, i) => {
                const Icon = FEATURE_ICONS[a.feature];
                const isSelected = selectedIds.has(a.id);
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group relative"
                  >
                    <div
                      className={`flex items-center gap-3 p-3.5 rounded-2xl transition cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50/50 ring-1 ring-emerald-200"
                          : "hover:bg-surface-2"
                      }`}
                    >
                      <label
                        className="flex items-center shrink-0 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(a.id)}
                          className="rounded border-hairline"
                        />
                      </label>
                      <Link
                        to={getFeatureRoute(a.feature)}
                        search={{ activityId: a.id }}
                        className="flex items-center gap-4 flex-1 min-w-0"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                              {FEATURE_LABELS[a.feature]}
                            </span>
                            <span className="text-[10px] text-ink-soft/60">
                              {formatTimestamp(a.timestamp)}
                            </span>
                          </div>
                          <p className="text-[13px] font-semibold text-ink mt-0.5 truncate">
                            {a.label}
                          </p>
                          {a.target && (
                            <p className="text-[11px] text-ink-soft truncate">{a.target}</p>
                          )}
                        </div>
                        <Clock
                          size={14}
                          className="text-ink-soft/30 group-hover:text-ink-soft/60 transition shrink-0"
                        />
                      </Link>
                      <button
                        onClick={(e) => handleSingleDelete(e, a)}
                        className="opacity-0 group-hover:opacity-100 size-6 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 transition-all shrink-0"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
