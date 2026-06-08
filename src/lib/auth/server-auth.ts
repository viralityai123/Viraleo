import { verifySession, SESSION_COOKIE, type SessionPayload } from "./session";
import { getKv } from "../kv";

export async function requireAuth(): Promise<{ email: string; name: string; sub: string }> {
  const secret = process.env.JWT_SECRET || "";
  if (!secret) throw new Error("SERVER_MISCONFIGURED");

  const { getCookie } = await import("@tanstack/start-server-core");
  const token = getCookie(SESSION_COOKIE);
  if (!token) throw new Error("UNAUTHORIZED");

  const session = await verifySession(token, secret);
  if (!session) throw new Error("UNAUTHORIZED");

  return { email: session.email, name: session.name, sub: session.sub };
}

const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  creator: 10,
  pro: 25,
};

export async function requireCredits(email: string): Promise<{ plan: string; remaining: number }> {
  const { getUserPlan } = await import("../user-plan");
  const stored = await getUserPlan(email);
  const plan = stored?.tier || "free";
  const maxCredits = PLAN_LIMITS[plan] || 1;

  const client = getKv();
  if (!client) throw new Error("KV_NOT_CONFIGURED");

  const d = new Date();
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const key = `usage:${email.toLowerCase().trim()}:${month}`;

  const used = (await client.get<number>(key)) || 0;
  if (used >= maxCredits) throw new Error("OUT_OF_CREDITS");
  await client.set(key, used + 1);

  return { plan, remaining: Math.max(0, maxCredits - used - 1) };
}
