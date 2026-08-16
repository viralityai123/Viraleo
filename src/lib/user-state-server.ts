import { getKv } from "./kv";
import { getUserPlan, saveUserPlan } from "./user-plan";
import { PLANS, type PlanTier, currentMonthKey, normalizeEmail } from "./plans";

export interface UserState {
  plan: PlanTier;
  used: number;
  maxCredits: number;
  remaining: number;
  month: string;
  hasPlan: boolean;
}

function usageKey(email: string, month: string): string {
  return `usage:${normalizeEmail(email)}:${month}`;
}

const DEFAULT_UNLIMITED_EMAILS = [
  "viraleo.support@gmail.com",
  "virality.ai123@gmail.com",
  "ganaganadeep172010@gmail.com",
];

function cleanEmailForMatch(email: string): string {
  const normalized = normalizeEmail(email);
  const [local, domain] = normalized.split("@");
  if (!domain) return normalized;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const cleanLocal = local.replace(/\./g, "").split("+")[0];
    return `${cleanLocal}@gmail.com`;
  }
  return normalized;
}

function getUnlimitedEmails(): string[] {
  const envRaw = process.env.ADMIN_UNLIMITED_EMAILS || "";
  const envList = envRaw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return [...DEFAULT_UNLIMITED_EMAILS, ...envList].map(cleanEmailForMatch);
}

function isUnlimited(email: string): boolean {
  const target = cleanEmailForMatch(email);
  return getUnlimitedEmails().some((e) => e === target);
}

export async function getUserState(email: string): Promise<UserState> {
  const month = currentMonthKey();
  if (isUnlimited(email)) {
    return { plan: "pro", used: 0, maxCredits: 999999, remaining: 999999, month, hasPlan: true };
  }
  const stored = await getUserPlan(email);
  const plan = (stored?.tier ?? "free") as PlanTier;
  const maxCredits = PLANS[plan].creditsPerMonth;

  const client = getKv();
  const used = client ? (await client.get<number>(usageKey(email, month))) ?? 0 : 0;

  return {
    plan,
    used,
    maxCredits,
    remaining: Math.max(0, maxCredits - used),
    month,
    hasPlan: stored !== null,
  };
}

export async function deductUserCredit(email: string): Promise<UserState> {
  if (isUnlimited(email)) {
    return { plan: "pro", used: 0, maxCredits: 999999, remaining: 999999, month: currentMonthKey(), hasPlan: true };
  }
  const client = getKv();
  if (!client) throw new Error("KV_NOT_CONFIGURED");

  const month = currentMonthKey();
  const stored = await getUserPlan(email);
  const plan = (stored?.tier ?? "free") as PlanTier;
  const maxCredits = PLANS[plan].creditsPerMonth;
  const key = usageKey(email, month);

  const used = (await client.get<number>(key)) ?? 0;
  if (used >= maxCredits) throw new Error("OUT_OF_CREDITS");
  await client.set(key, used + 1);

  return {
    plan,
    used: used + 1,
    maxCredits,
    remaining: Math.max(0, maxCredits - used - 1),
    month,
    hasPlan: stored !== null,
  };
}

export async function assignUserPlan(email: string, tier: PlanTier): Promise<UserState> {
  await saveUserPlan(email, tier);
  return getUserState(email);
}
