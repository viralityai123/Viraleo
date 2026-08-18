import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";

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
const SHOTS = "scratch/shots";
mkdirSync(SHOTS, { recursive: true });

const username = process.argv[2] || "thedigitalpremlata";
const text =
  "I've built 10+ winning websites for founders who had no tech background – I can make your product look world-class too. Want me to send a few portfolio links?";

const browser = await chromium.launch({
  headless: false,
  args: ["--disable-blink-features=AutomationControlled"],
});
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  viewport: { width: 1280, height: 800 },
  locale: "en-US",
});
const page = await context.newPage();
page.setDefaultTimeout(20_000);

const captured: any[] = [];
page.on("request", (req) => {
  if (!req.url().includes("/graphql/")) return;
  const post = req.postData() || "";
  if (!post.includes("doc_id")) return;
  const vars = decodeURIComponent((post.match(/variables=([^&]*)/) || [])[1] || "");
  const doc = (post.match(/doc_id=(\d+)/) || [])[1];
  const fn = decodeURIComponent((post.match(/fb_api_req_friendly_name=([^&]+)/) || [])[1] || "");
  captured.push({ url: req.url(), doc, fn, vars, post: post.slice(0, 800) });
  appendFileSync(`${SHOTS}/mutation-captures.jsonl`, JSON.stringify({ url: req.url(), doc, fn, vars, ts: Date.now() }) + "\n");
  console.log("CAPTURED:", fn, "doc:", doc);
});

console.log("== login ==");
await page.goto("https://www.threads.net/login", { waitUntil: "domcontentloaded", timeout: 40_000 });
await page.waitForTimeout(3500);
const u1 = page
  .locator('input[name="username"], input[placeholder="Username, phone or email"], input[type="text"]')
  .first();
const p1 = page.locator('input[name="password"], input[type="password"]').first();
if ((await u1.count().catch(() => 0)) > 0) {
  await u1.fill(env.THREADS_EMAIL || "mue.menti");
  await p1.fill(env.THREADS_PASSWORD || "Rasheed@910").catch(() => {});
  const sub = page.locator('button[type="submit"], input[type="submit"], div[role="button"]:has-text("Log in")').first();
  if (await sub.count().catch(() => 0)) await sub.click({ timeout: 10_000 }).catch(() => {});
  else await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);
} else {
  const ig = page.locator('button:has-text("Continue with Instagram"), div[role="button"]:has-text("Continue with Instagram")').first();
  if (await ig.count().catch(() => 0)) {
    await ig.click({ timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(4000);
  }
}
if (page.url().includes("instagram.com/accounts/login")) {
  const u2 = page.locator('input[name="username"], input[placeholder="Phone number, username, or email"], input[type="text"]').first();
  const p2 = page.locator('input[name="password"], input[type="password"]').first();
  if ((await u2.count().catch(() => 0)) > 0) {
    await u2.fill(env.THREADS_EMAIL || "mue.menti");
    await p2.fill(env.THREADS_PASSWORD || "Rasheed@910").catch(() => {});
    const sub = page.locator('button[type="submit"], div[role="button"]:has-text("Log in")').first();
    if (await sub.count().catch(() => 0)) await sub.click({ timeout: 10_000 }).catch(() => {});
    else await page.keyboard.press("Enter");
    await page.waitForTimeout(5000);
  }
}
try {
  await page.waitForURL(/threads\.(net|com)\//, { timeout: 45_000 });
} catch {}
for (const label of ["Not now", "Not Now", "Skip", "Continue", "Allow", "Yes"]) {
  const btn = page.locator(`div[role="button"]:has-text("${label}"), button:has-text("${label}")`).first();
  if (await btn.count().catch(() => 0)) {
    await btn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
  }
}
console.log("logged in, url:", page.url());

await page.goto(`https://www.threads.com/@${username}/`, { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(4000);
const postLink = page.locator('a[href*="/post/"]').first();
const href = await postLink.getAttribute("href").catch(() => null);
console.log("post href:", href);
if (!href) {
  await postLink.click({ force: true }).catch(() => {});
  await page.waitForTimeout(5000);
} else {
  await page.goto("https://www.threads.com" + href, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(3500);
}

const replyBtn = page
  .locator('[aria-label="Reply"], [aria-label="Reply to this post"], [data-testid="reply_button"]')
  .first();
await replyBtn.click({ timeout: 15000 }).catch((e) => console.log("reply click fail:", e.message.slice(0, 120)));
await page.waitForTimeout(3000);

const dialog = page.locator('[role="dialog"]');
console.log("dialog:", (await dialog.count().catch(() => 0)) > 0);

const editable = page.locator('[contenteditable="true"]').first();
await editable.evaluate((el) => (el as HTMLElement).focus()).catch(() => {});
await page.waitForTimeout(500);
await page.keyboard.type(text, { delay: 20 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${SHOTS}/c6-typed.png` });

const postBtn = dialog.locator('[role="button"]:has-text("Post")').first();
const disabled = await postBtn.getAttribute("aria-disabled").catch(() => null);
console.log("Post btn disabled:", disabled);
await postBtn.click({ timeout: 8000 }).catch((e) => console.log("post click fail:", e.message.slice(0, 120)));
await page.waitForTimeout(9000);
await page.screenshot({ path: `${SHOTS}/c6-after.png` });

console.log("--- captured mutations:", captured.length);
for (const c of captured) {
  console.log("EVT:", c.fn, "| doc:", c.doc, "| url:", c.url);
  try {
    const v = JSON.parse(c.vars);
    console.log("  vars keys:", Object.keys(v).join(","));
    if (v.postCreationParam) console.log("  creationParam keys:", Object.keys(v.postCreationParam).join(","));
  } catch {
    console.log("  raw vars:", c.vars.slice(0, 400));
  }
}

await page.waitForTimeout(2000);
await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(6000);
const bodyText = await page.locator("body").innerText().catch(() => "");
console.log("reply visible on page:", bodyText.includes("world-class"));

await browser.close();
