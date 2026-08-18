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
const st = await kv.get("threads:cookies");

const raw = JSON.parse(readFileSync("scratch/shots/mutation-FINAL.json", "utf8"));
const post = raw.post;
const get = (k: string) => {
  const m = post.match(new RegExp(k + "=([^&]*)"));
  return m ? decodeURIComponent(m[1]) : "";
};

const updated = {
  ...st,
  lsd: get("lsd") || st.lsd,
  fbDtsg: get("fb_dtsg") || st.fbDtsg,
  jazoest: get("jazoest") || st.jazoest,
  rev: get("__rev") || st.rev,
  hs: get("__hs") || st.hs,
  spinR: get("__spin_r") || st.spinR,
  spinB: get("__spin_b") || st.spinB,
  spinT: get("__spin_t") || st.spinT,
  av: get("av") || st.av,
  ts: Date.now(),
};
await kv.set("threads:cookies", updated);
console.log("saved tokens:", {
  lsd: updated.lsd.slice(0, 12),
  fbDtsg: updated.fbDtsg.slice(0, 12),
  jazoest: updated.jazoest,
  rev: updated.rev,
  hs: updated.hs.slice(0, 20),
  av: updated.av,
});