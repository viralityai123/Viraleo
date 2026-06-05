const STORAGE_KEY = "viraleo:credits";
const SETTINGS_KEY = "viraleo:plan";

export type PlanTier = "free" | "creator" | "pro";

interface PlanConfig {
  label: string;
  creditsPerMonth: number;
  price: string;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: { label: "Free", creditsPerMonth: 1, price: "Free" },
  creator: { label: "Creator", creditsPerMonth: 10, price: "$20/mo" },
  pro: { label: "Pro", creditsPerMonth: 25, price: "$50/mo" },
};

interface CreditState {
  credits: number;
  month: string; // YYYY-MM
  plan: PlanTier;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getPlan(): PlanTier {
  if (typeof localStorage === "undefined") return "free";
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return "free";
    const parsed = JSON.parse(raw);
    return parsed.plan === "creator" || parsed.plan === "pro" ? parsed.plan : "free";
  } catch {
    return "free";
  }
}

function savePlan(plan: PlanTier): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    existing.plan = plan;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn("Failed to save plan:", e);
  }
}

function loadState(): CreditState {
  const plan = getPlan();
  const month = currentMonthKey();
  if (typeof localStorage === "undefined") return { credits: PLANS[plan].creditsPerMonth, month, plan };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { credits: PLANS[plan].creditsPerMonth, month, plan };
    const state = JSON.parse(raw) as CreditState;
    if (state.month !== month || state.plan !== plan) {
      state.credits = PLANS[plan].creditsPerMonth;
      state.month = month;
      state.plan = plan;
      saveState(state);
    }
    return state;
  } catch {
    return { credits: PLANS[plan].creditsPerMonth, month, plan };
  }
}

function saveState(state: CreditState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save credits:", e);
  }
}

export function getCredits(): number {
  return loadState().credits;
}

export function getMaxCredits(): number {
  return PLANS[getPlan()].creditsPerMonth;
}

export function getPlanInfo(): { tier: PlanTier; label: string; price: string } {
  const tier = getPlan();
  return { tier, label: PLANS[tier].label, price: PLANS[tier].price };
}

export function setPlan(tier: PlanTier): void {
  savePlan(tier);
  const month = currentMonthKey();
  const state: CreditState = { credits: PLANS[tier].creditsPerMonth, month, plan: tier };
  saveState(state);
}

export function hasCredits(): boolean {
  return getCredits() > 0;
}

export function deductCredit(): number {
  const state = loadState();
  if (state.credits <= 0) return 0;
  state.credits -= 1;
  saveState(state);
  return state.credits;
}

export function getNextResetDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-US", { month: "long" });
}
