const MAX_ITEMS = 100;
let currentEmail = "";

export function setActivityEmail(email: string) {
  const next = email.toLowerCase().trim();
  if (next === currentEmail) return;
  currentEmail = next;
  if (next) purgeLegacySharedKeys();
}

export function getActivityEmail() {
  return currentEmail;
}

function activityKey(): string | null {
  if (!currentEmail) return null;
  return `viraleo:activity:${currentEmail}`;
}

function resultPrefix(): string | null {
  if (!currentEmail) return null;
  return `viraleo:result:${currentEmail}:`;
}

/** Remove pre-per-account keys that leaked data across logins */
export function purgeLegacySharedKeys(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem("viraleo:activity");
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("viraleo:result:") && !k.includes("@")) {
        toRemove.push(k);
      }
      if (k.startsWith("viraleo:result:") && k.split(":").length === 3) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn("Failed to purge legacy activity keys:", e);
  }
}

export interface ActivityEntry {
  id: string;
  feature: "pre-analysis" | "thumbnail-test" | "niche-ranker" | "shadowban-detector";
  label: string;
  target?: string;
  timestamp: number;
}

function loadActivities(): ActivityEntry[] {
  if (typeof localStorage === "undefined") return [];
  const key = activityKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as ActivityEntry[];
  } catch {
    return [];
  }
}

function saveActivities(activities: ActivityEntry[]): void {
  if (typeof localStorage === "undefined") return;
  const key = activityKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(activities.slice(0, MAX_ITEMS)));
  } catch (e) {
    console.warn("Failed to save activities:", e);
  }
}

export function getRecentActivities(limit = 5): ActivityEntry[] {
  if (!currentEmail) return [];
  return loadActivities().slice(0, limit);
}

export function getAllActivities(): ActivityEntry[] {
  if (!currentEmail) return [];
  return loadActivities();
}

export function addActivity(
  feature: ActivityEntry["feature"],
  label: string,
  target?: string,
): ActivityEntry {
  if (!currentEmail) {
    throw new Error("ACTIVITY_EMAIL_REQUIRED");
  }
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
  if (typeof localStorage === "undefined" || !currentEmail) return null;
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
  if (!currentEmail) return;
  const activities = loadActivities();
  if (activities.some((a) => a.id === entry.id)) return;
  activities.unshift(entry);
  saveActivities(activities);
}

export function clearActivities(): void {
  if (typeof localStorage === "undefined") return;
  const key = activityKey();
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("Failed to clear activities:", e);
  }
}

function evictOldestResult(): boolean {
  const prefix = resultPrefix();
  if (!prefix || typeof localStorage === "undefined") return false;
  const keys: { key: string; ts: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) {
      const ts = parseInt(k.replace(prefix, "").split("-")[0], 10) || 0;
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
  const prefix = resultPrefix();
  if (!prefix) return;
  const storageKey = prefix + activityId;
  const trySet = () => localStorage.setItem(storageKey, JSON.stringify(data));
  try {
    trySet();
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      if (evictOldestResult()) {
        try {
          trySet();
          return;
        } catch {
          /* continue */
        }
      }
      const activities = loadActivities();
      if (activities.length > 0) {
        const oldest = activities.pop()!;
        deleteResult(oldest.id);
        saveActivities(activities);
        try {
          trySet();
          return;
        } catch {
          /* continue */
        }
      }
    }
    console.warn("Failed to save result:", e);
  }
}

export function loadResult<T = unknown>(activityId: string): T | null {
  if (typeof localStorage === "undefined" || !currentEmail) return null;
  const prefix = resultPrefix();
  if (!prefix) return null;
  try {
    const raw = localStorage.getItem(prefix + activityId);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function deleteResult(activityId: string): void {
  if (typeof localStorage === "undefined") return;
  const prefix = resultPrefix();
  if (!prefix) return;
  try {
    localStorage.removeItem(prefix + activityId);
  } catch (e) {
    console.warn("Failed to delete result:", e);
  }
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
