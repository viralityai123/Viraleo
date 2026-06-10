import { verifySession, SESSION_COOKIE } from "./session";

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

export async function requireCredits(email: string): Promise<{ plan: string; remaining: number }> {
  const { deductUserCredit } = await import("../user-state-server");
  const state = await deductUserCredit(email);
  return { plan: state.plan, remaining: state.remaining };
}
