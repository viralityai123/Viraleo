import { readFileSync, existsSync } from "node:fs";
let s = "";
for (const f of [".env.local", ".env"]) {
  if (existsSync(f)) s += readFileSync(f, "utf8") + "\n";
}
const out: Record<string, string> = {};
for (const l of s.split("\n")) {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
for (const [k, v] of Object.entries(out)) process.env[k] = v;

const { getKv } = await import("../src/lib/kv");
const kv = await getKv();
const st = await kv.get("threads:cookies");
console.log("keys:", st ? Object.keys(st) : null);
console.log(
  "cookie names:",
  st && st.cookies ? st.cookies.split("; ").map((p) => p.split("=")[0]).join(", ") : "NONE"
);
console.log("lsd?", !!st?.lsd, "fbDtsg?", !!st?.fbDtsg, "jazoest?", !!st?.jazoest, "rev?", !!st?.rev);
