import { getKv } from "@/lib/kv";

export interface ThreadsSession {
  cookies: string;
  sessionId: string;
  csrfToken: string;
  userId: string;
  ts: number;
}

const SESSION_KEY = "threads:cookies";
const CREDENTIALS_KEY = "threads:credentials";

let cachedSession: { data: ThreadsSession; at: number } | null = null;
const CACHE_MS = 5 * 60_000;

export async function getSession(): Promise<ThreadsSession | null> {
  if (cachedSession && Date.now() - cachedSession.at < CACHE_MS) return cachedSession.data;
  try {
    const kv = getKv();
    if (kv) {
      const raw = await kv.get<ThreadsSession>(SESSION_KEY);
      if (raw && raw.cookies && raw.sessionId) {
        cachedSession = { data: raw, at: Date.now() };
        return raw;
      }
    }
  } catch {
    // fall through to env
  }
  const envSession: ThreadsSession | null =
    process.env.THREADS_SESSION_ID && process.env.THREADS_COOKIES
      ? {
          cookies: process.env.THREADS_COOKIES,
          sessionId: process.env.THREADS_SESSION_ID,
          csrfToken: process.env.THREADS_CSRF_TOKEN || "",
          userId: process.env.THREADS_USER_ID || "",
          ts: 0,
        }
      : null;
  if (envSession) cachedSession = { data: envSession, at: Date.now() };
  return envSession;
}

export async function setSession(s: ThreadsSession): Promise<void> {
  const kv = getKv();
  if (!kv) throw new Error("KV not configured — cannot persist session");
  await kv.set(SESSION_KEY, { ...s, ts: Date.now() });
  cachedSession = { data: { ...s, ts: Date.now() }, at: Date.now() };
}

export function clearSessionCache(): void {
  cachedSession = null;
}

export interface ThreadsCredentials {
  email: string;
  password: string;
}

export async function getCredentials(): Promise<ThreadsCredentials | null> {
  if (process.env.THREADS_EMAIL && process.env.THREADS_PASSWORD) {
    return { email: process.env.THREADS_EMAIL, password: process.env.THREADS_PASSWORD };
  }
  try {
    const kv = getKv();
    if (!kv) return null;
    const raw = await kv.get<ThreadsCredentials>(CREDENTIALS_KEY);
    if (raw && raw.email && raw.password) return raw;
  } catch {
    // ignore
  }
  return null;
}