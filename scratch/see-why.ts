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
const page = await context.newPage();
await page.goto("https://www.threads.com/@myrasharma808/post/DcL1LRtEUB0", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(7000);
const seeWhy = page.locator('[role="button"]:has-text("See why")').first();
console.log("seeWhy count:", await seeWhy.count());
await seeWhy.click().catch((e) => console.log("click err:", e.message.slice(0, 80)));
await page.waitForTimeout(4000);
await page.screenshot({ path: "scratch/shots/see-why.png" });
const text = await page.locator("body").innerText().catch(() => "");
const i = text.indexOf("See why");
console.log("--- body around reason:");
console.log(text.slice(Math.max(0, i - 600), i + 1500));
await browser.close();