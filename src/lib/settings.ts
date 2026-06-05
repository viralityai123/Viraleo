const STORAGE_KEY = "viraleo:settings";

export interface UserSettings {
  displayName: string;
  sidebarMode: "auto-hide" | "expanded";
  defaultFormat: "short" | "long";
  theme: "light" | "dark";
}

const DEFAULTS: UserSettings = {
  displayName: "User",
  sidebarMode: "auto-hide",
  defaultFormat: "short",
  theme: "light",
};

function loadSettings(): UserSettings {
  if (typeof localStorage === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings: UserSettings): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Failed to save settings:", e);
  }
}

export function getSettings(): UserSettings {
  return loadSettings();
}

export function updateSettings(partial: Partial<UserSettings>): UserSettings {
  const current = loadSettings();
  const updated = { ...current, ...partial };
  saveSettings(updated);
  return updated;
}

export function clearAllData(): void {
  if (typeof localStorage === "undefined") return;
  const keys = Object.keys(localStorage).filter((k) => k.startsWith("viraleo:"));
  keys.forEach((k) => localStorage.removeItem(k));
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.clear();
  }
}
