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

const { chromium } = await import("playwright");
const browser = await chromium.launch({
  headless: false,
  args: ["--disable-blink-features=AutomationControlled"],
});
const context = await browser.newContext({
  storageState: "scratch/shots/storage-state.json",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  viewport: { width: 1280, height: 800 },
  locale: "en-US",
});
console.log("state cookies:", (JSON.parse(readFileSync("scratch/shots/storage-state.json", "utf8")).cookies || []).map((c: any) => c.name).join(", "));
const page = await context.newPage();
await page.goto("https://www.threads.com/@kathylonor/", { waitUntil: "domcontentloaded" }).catch((e) => console.log("goto err:", e.message.slice(0, 80)));
await page.waitForTimeout(10000);
const body = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 400);
console.log("BODY:", body);
console.log("url:", page.url());
await page.screenshot({ path: "scratch/shots/dbg-session.png" }).catch(() => {});
const postLink = page.locator('a[href*="/post/"]').first();
console.log("post href:", await postLink.getAttribute("href").catch(() => null));
console.log("continue IG:", await page.locator('text=Continue with Instagram').count().catch(() => 0));
await browser.close();