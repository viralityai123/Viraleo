const STORAGE_KEY = "viraleo:activity";
const RESULT_PREFIX = "viraleo:result:";
const MAX_ITEMS = 100;

export interface ActivityEntry {
  id: string;
  feature: "pre-analysis" | "thumbnail-test" | "niche-ranker" | "shadowban-detector";
  label: string;
  target?: string;
  timestamp: number;
}

function loadActivities(): ActivityEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ActivityEntry[];
  } catch {
    return [];
  }
}

function saveActivities(activities: ActivityEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities.slice(0, MAX_ITEMS)));
  } catch (e) {
    console.warn("Failed to save activities:", e);
  }
}

export function getRecentActivities(limit = 5): ActivityEntry[] {
  return loadActivities().slice(0, limit);
}

export function getAllActivities(): ActivityEntry[] {
  return loadActivities();
}

export function addActivity(
  feature: ActivityEntry["feature"],
  label: string,
  target?: string
): ActivityEntry {
  const activities = loadActivities();
  const entry: ActivityEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    feature,
    label,
    target,
    timestamp: Date.now(),
  };
  activities.unshift(entry);
  saveActivities(activities);
  return entry;
}

export function deleteActivity(id: string): ActivityEntry | null {
  if (typeof localStorage === "undefined") return null;
  const activities = loadActivities();
  const idx = activities.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const deleted = activities[idx];
  activities.splice(idx, 1);
  saveActivities(activities);
  deleteResult(id);
  return deleted;
}

export function restoreActivity(entry: ActivityEntry): void {
  const activities = loadActivities();
  if (activities.some((a) => a.id === entry.id)) return;
  activities.unshift(entry);
  saveActivities(activities);
}

export function clearActivities(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function evictOldestResult(): boolean {
  const keys: { key: string; ts: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(RESULT_PREFIX)) {
      const ts = parseInt(k.replace(RESULT_PREFIX, "").split("-")[0], 10) || 0;
      keys.push({ key: k, ts });
    }
  }
  keys.sort((a, b) => a.ts - b.ts);
  if (keys.length > 0) {
    localStorage.removeItem(keys[0].key);
    return true;
  }
  return false;
}

export function saveResult(activityId: string, data: unknown): void {
  if (typeof localStorage === "undefined") return;
  const trySet = () => localStorage.setItem(RESULT_PREFIX + activityId, JSON.stringify(data));
  try {
    trySet();
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      if (evictOldestResult()) {
        try { trySet(); return; } catch {}
      }
      const activities = loadActivities();
      if (activities.length > 0) {
        const oldest = activities.pop()!;
        deleteResult(oldest.id);
        saveActivities(activities);
        try { trySet(); return; } catch {}
      }
    }
    console.warn("Failed to save result:", e);
  }
}

export function loadResult<T = unknown>(activityId: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(RESULT_PREFIX + activityId);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function deleteResult(activityId: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(RESULT_PREFIX + activityId);
  } catch {}
}

export function getFeatureIcon(feature: ActivityEntry["feature"]): string {
  const icons: Record<ActivityEntry["feature"], string> = {
    "pre-analysis": "Search",
    "thumbnail-test": "ImageIcon",
    "niche-ranker": "Sparkles",
    "shadowban-detector": "ShieldAlert",
  };
  return icons[feature] || "FileText";
}

export function getFeatureRoute(feature: ActivityEntry["feature"]): string {
  const routes: Record<ActivityEntry["feature"], string> = {
    "pre-analysis": "/pre-analysis",
    "thumbnail-test": "/thumbnail-test",
    "niche-ranker": "/niche-ranker",
    "shadowban-detector": "/shadowban-detector",
  };
  return routes[feature] || "/";
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
