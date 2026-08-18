import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  let s = "";
  for (const f of [".env.local", ".env"]) {
    if (existsSync(f)) s += readFileSync(f, "utf8") + "\n";
  }
  const out: Record<string, string> = {};
  for (const line of s.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const env = loadEnv();
for (const [k, v] of Object.entries(env)) process.env[k] = v;

const { getKv } = await import("../src/lib/kv");
const kv = await getKv();
const aa = await kv.hgetall("threads:autoapprove");
console.log("autoapprove:", JSON.stringify(aa));
const replies = await kv.get("threads:replies:" + new Date().toISOString().slice(0, 10));
console.log("replies today:", replies);
const st = await kv.get("threads:monitor");
console.log("monitor state:", JSON.stringify(st));
const tracker = await kv.lrange("threads:tracker", 0, -1);
console.log("tracker rows:", tracker ? tracker.length : 0);
for (const row of (tracker || []).slice(-5)) console.log("  ", typeof row === "string" ? row.slice(0, 120) : "");