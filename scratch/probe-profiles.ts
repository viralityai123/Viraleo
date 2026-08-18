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

const users = ["thedigitalpremlata", "natalie1326007", "bat.6801366", "figma.expert", "myrasharma808", "mue.menti"];
for (const u of users) {
  await page.goto(`https://www.threads.com/@${u}/`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(4500);
  const postLink = page.locator('a[href*="/post/"]').first();
  const href = await postLink.getAttribute("href").catch(() => null);
  const body = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 90);
  console.log(u, "=>", href ? `LIVE ${href}` : `DEAD/404: ${body.slice(0, 60)}`);
}
await browser.close();