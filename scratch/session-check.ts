import { readFileSync, writeFileSync, existsSync } from "node:fs";

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
if (!st?.cookies) {
  console.log("NO SESSION STORED");
  process.exit(1);
}
console.log("stored session:", "uid=" + st.userId, "ageH=" + Math.round((Date.now() - st.ts) / 3600000));

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  viewport: { width: 1280, height: 800 },
  locale: "en-US",
});
const pairs = (st.cookies || "").split("; ").filter(Boolean).map((p) => {
  const [name, ...rest] = p.split("=");
  return { name, value: rest.join("=") };
});
const domain = (name: string) =>
  name === "ig_did" || name === "rur" ? ".instagram.com" : ".threads.com";
await context.addCookies(
  pairs.map((c) => ({ name: c.name, value: c.value, domain: domain(c.name), path: "/" }))
);
console.log("cookies:", pairs.map((c) => c.name).join(", "));

const page = await context.newPage();
await page.goto("https://www.threads.com/@kathylonor/", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(8000);
const postLink = page.locator('a[href*="/post/"]').first();
const href = await postLink.getAttribute("href").catch(() => null);
const loginDiag = await page.locator('text=Continue with Instagram').count().catch(() => 0);
console.log("post href:", href, "| login dialog:", loginDiag > 0);
writeFileSync("scratch/shots/session-check.json", JSON.stringify({ href, loginDiag, ts: Date.now() }));
await browser.close();
console.log(href || loginDiag > 0 ? (href ? "SESSION ALIVE" : "SESSION DEAD") : "SESSION DEAD");