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

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: "scratch/shots/storage-state.json",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
});
const page = await context.newPage();
await page.goto("https://www.threads.com/@myrasharma808/post/DcL1LRtEUB0", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(8000);
const html = await page.content();

for (const needle of ["What happened", "removed your comment", "You shared this on your profile", "See why"]) {
  const i = html.indexOf(needle);
  console.log("---", needle, "@", i);
  if (i >= 0) console.log(html.slice(Math.max(0, i - 1500), i + 500).replace(/></g, ">\n<").slice(-2200));
}
await browser.close();