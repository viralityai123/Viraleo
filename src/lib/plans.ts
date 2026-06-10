export type PlanTier = "free" | "creator" | "pro";

export interface PlanConfig {
  label: string;
  creditsPerMonth: number;
  price: string;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: { label: "Free", creditsPerMonth: 1, price: "Free" },
  creator: { label: "Creator", creditsPerMonth: 10, price: "$20/mo" },
  pro: { label: "Pro", creditsPerMonth: 25, price: "$50/mo" },
};

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getNextResetDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-US", { month: "long" });
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
