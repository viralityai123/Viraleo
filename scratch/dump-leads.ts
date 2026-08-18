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
const raw = await kv.lrange("threads:queue", 0, -1);
if (!raw || raw.length === 0) {
  console.log("queue empty");
  process.exit(0);
}
const leads: any[] = [];
for (const r of raw) {
  let v = r;
  try {
    for (let depth = 0; depth < 3; depth++) {
      if (typeof v !== "string") break;
      const p = JSON.parse(v);
      if (Array.isArray(p)) {
        for (const item of p) {
          const inner = typeof item === "string" ? JSON.parse(item) : item;
          if (inner && typeof inner === "object") leads.push(inner);
        }
        v = null;
        break;
      }
      v = p;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) leads.push(v);
  } catch {
    // skip unparsable
  }
}
console.log("total in queue:", leads.length);
const statuses: Record<string, number> = {};
for (const l of leads) statuses[l.status] = (statuses[l.status] || 0) + 1;
console.log("statuses:", JSON.stringify(statuses));

const nowSec = Date.now() / 1000;
const fresh = leads
  .filter((l: any) => l.status === "approved" || l.status === "queued")
  .filter((l: any) => l.takenAt && nowSec - l.takenAt < 24 * 60 * 60)
  .sort((a: any, b: any) => (b.takenAt || 0) - (a.takenAt || 0));
console.log("fresh (<24h):", fresh.length);
console.log("\n=== FRESH HOT LEADS (newest first) ===");
for (const l of fresh) {
  const ts = l.takenAt ? new Date(l.takenAt * 1000).toISOString().slice(5, 16) + " UTC" : "?";
  console.log(`[${l.intentScore}] @${l.username} (${l.category}) post:${ts}`);
  console.log(`    text: ${(l.text || "").slice(0, 160)}`);
  console.log(`    url:  ${l.postUrl || l.url || ""}`);
  if (l.replyDrafts && l.replyDrafts[0]) console.log(`    draftA: ${l.replyDrafts[0].slice(0, 220)}`);
}