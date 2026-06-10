export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  iat: number;
  exp: number;
}

export const SESSION_COOKIE = "viraleo_session";
const SESSION_TTL_SEC = 7 * 24 * 60 * 60;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64ToBytes(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return bytesToBase64(new Uint8Array(sig));
}

async function hmacVerify(data: string, secret: string, signature: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigBytes = base64ToBytes(signature);
  return crypto.subtle.verify("HMAC", key, sigBytes.buffer as ArrayBuffer, enc.encode(data));
}

export async function signSession(
  payload: Omit<SessionPayload, "iat" | "exp">,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full: SessionPayload = { ...payload, iat: now, exp: now + SESSION_TTL_SEC };
  const header = bytesToBase64(
    new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const body = bytesToBase64(new TextEncoder().encode(JSON.stringify(full)));
  const data = `${header}.${body}`;
  const sig = await hmacSign(data, secret);
  return `${data}.${sig}`;
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [, body, sig] = parts;
  const data = `${parts[0]}.${body}`;
  const valid = await hmacVerify(data, secret, sig);
  if (!valid) return null;
  try {
    const payload: SessionPayload = JSON.parse(new TextDecoder().decode(base64ToBytes(body)));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  cookieHeader.split(";").forEach((pair) => {
    const eq = pair.indexOf("=");
    if (eq === -1) return;
    const key = pair.substring(0, eq).trim();
    const val = pair.substring(eq + 1).trim();
    if (key) result[key] = val;
  });
  return result;
}

export function getSessionCookie(headers: Record<string, string>): string | undefined {
  return headers[SESSION_COOKIE];
}

export function serializeSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_TTL_SEC}; SameSite=Lax; Secure`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

export function getSessionFromToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let body = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (body.length % 4) body += "=";
    const decoded = JSON.parse(atob(body));
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getSessionFromServer(
  headers: Headers,
  secret: string,
): Promise<SessionPayload | null> {
  const cookieHeader = headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return verifySession(token, secret);
}

export function getSessionToken(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = parseCookies(document.cookie);
  return cookies[SESSION_COOKIE] || null;
}

export function getSessionFromDocument(): SessionPayload | null {
  if (typeof document === "undefined") return null;
  const cookies = parseCookies(document.cookie);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let body = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (body.length % 4) body += "=";
    const decoded = JSON.parse(atob(body));
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}
