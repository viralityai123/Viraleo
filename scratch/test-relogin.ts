import { readFileSync } from "node:fs";

function loadEnv() {
  const txt = readFileSync(".env.local", "utf8");
  for (const line of txt.split("\n")) {
    const clean = line.replace(/\r$/, "");
    const m = clean.match(/^([^=]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();
process.env.THREADS_EMAIL = "mue.menti";
process.env.THREADS_PASSWORD = "Rasheed@910";
console.log("url len:", process.env.UPSTASH_REDIS_REST_URL?.length);
console.log("tok len:", process.env.UPSTASH_REDIS_REST_TOKEN?.length);

const { getKv } = await import("../src/lib/kv");
const kv = getKv();
console.log("kv:", !!kv);
const raw = await kv?.get("threads:credentials");
console.log("raw:", JSON.stringify(raw));

const { getCredentials, getSession } = await import("../src/lib/threads/session");
console.log("creds:", JSON.stringify((await getCredentials())?.email));

const { reloginThreadsSession } = await import("../src/lib/threads/relogin");
const timeoutMs = 150_000;
const result = await Promise.race([
  reloginThreadsSession(),
  new Promise<Awaited<ReturnType<typeof reloginThreadsSession>>>((res) =>
    setTimeout(() => res({ ok: false, reason: "timeout" }), timeoutMs),
  ),
]);
console.log("RESULT:", JSON.stringify(result));
if (result.ok) {
  const s = await getSession();
  console.log("SESSION sessionId:", s?.sessionId?.slice(0, 12), "cookies len:", s?.cookies?.length);
}
process.exit(0);