import { getKv, isKvConfigured } from "./kv";

export type PlanTier = "free" | "creator" | "pro";

interface StoredPlan {
  tier: PlanTier;
  updatedAt: number;
}

function planKey(email: string): string {
  return `userPlan:${email.toLowerCase().trim()}`;
}

export async function saveUserPlan(email: string, tier: PlanTier): Promise<void> {
  const client = getKv();
  if (!client) return;
  const key = planKey(email);
  const data: StoredPlan = { tier, updatedAt: Date.now() };
  await client.set(key, data);
}

export async function getUserPlan(email: string): Promise<StoredPlan | null> {
  const client = getKv();
  if (!client) return null;
  const key = planKey(email);
  return client.get<StoredPlan>(key);
}

export async function clearAllPlanData(): Promise<number> {
  const client = getKv();
  if (!client) return 0;
  let deleted = 0;
  for (const pattern of ["userPlan:*", "usage:*"]) {
    let cursor = 0;
    do {
      const [next, keys] = await client.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(next);
      if (keys.length > 0) {
        await client.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== 0);
  }
  return deleted;
}
