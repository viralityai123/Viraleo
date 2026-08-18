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
for (const c of ["web-design", "ui-ux", "landing-page"]) {
  await kv.hset("threads:autoapprove", { [c]: "0" });
}
console.log("disabled auto-approve for web-design, ui-ux, landing-page");
console.log("now:", JSON.stringify(await kv.hgetall("threads:autoapprove")));