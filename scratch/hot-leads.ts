import { readFileSync, existsSync, writeFileSync } from "node:fs";

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

const leads: any[] = [];
for (const r of raw || []) {
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
  } catch {}
}

const SELLABLE = new Set(["web-design", "branding", "landing-page", "ecommerce", "saas-app", "ai-automation", "ui-ux", "lead-service"]);
const nowSec = Date.now() / 1000;
const done = new Set<string>();
const hot = leads
  .filter((l: any) => l.status === "approved" || l.status === "queued")
  .filter((l: any) => SELLABLE.has(l.category))
  .filter((l: any) => l.takenAt && nowSec - l.takenAt < 36 * 60 * 60)
  .filter((l: any) => {
    const k = l.username + l.postId;
    if (done.has(k)) return false;
    done.add(k);
    return true;
  })
  .sort((a: any, b: any) => (b.takenAt || 0) - (a.takenAt || 0));

let out = `# HOT LEADS — ${new Date().toISOString().slice(0, 16)} UTC\n\n${hot.length} sellable leads, newest first. Draft included as starting point — rewrite it, don't copy verbatim (moderation flags duplicates).\n\n`;
let i = 1;
for (const l of hot) {
  const ts = l.takenAt ? new Date(l.takenAt * 1000).toISOString().slice(5, 16) + " UTC" : "?";
  out += `## ${i++}. [${l.intentScore}] @${l.username} — ${l.category} (post ${ts})\n`;
  out += `- URL: https://www.threads.com/@${l.username}/post/${l.postId.replace(/^.*?post\//, "")}\n`;
  out += `- Post: ${(l.text || "").slice(0, 300).replace(/\n/g, " ")}\n`;
  const draft = (l.replyDrafts || [])[0] || "";
  out += `- Draft: ${draft}\n\n`;
}
writeFileSync("scratch/hot-leads.md", out);
console.log("wrote scratch/hot-leads.md with", hot.length, "sellable leads");
console.log(hot.slice(0, 14).map((l: any) => `[${l.intentScore}] @${l.username} (${l.category}) ${l.text?.slice(0, 70)?.replace(/\n/g, " ")}`).join("\n"));