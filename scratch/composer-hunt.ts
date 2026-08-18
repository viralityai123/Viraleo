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

const username = process.argv[2] || "anikonorris";
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

const crUrl = new Set<string>();
page.on("response", async (res) => {
  try {
    const u = res.url();
    if (!/\.js/.test(u)) return;
    if (crUrl.has(u)) return;
    const body = await res.text().catch(() => "");
    if (body.includes('__d("cr:35821"')) {
      crUrl.add(u);
      console.log("!!! cr:35821 DEFINITION chunk:", u);
      writeFileSync(`${SHOTS}/cr35821-chunk.js`, body);
      const idx = body.indexOf('__d("cr:35821"');
      writeFileSync(`${SHOTS}/cr35821-module.txt`, body.slice(Math.max(0, idx - 400), idx + 3000));
    }
  } catch {}
});

console.log("== login ==");
await page.goto("https://www.threads.net/login", { waitUntil: "domcontentloaded", timeout: 40_000 });
await page.waitForTimeout(3500);
const usernameInput = page
  .locator('input[name="username"], input[placeholder="Username, phone or email"], input[type="text"]')
  .first();
const pwInput = page.locator('input[name="password"], input[type="password"]').first();
if ((await usernameInput.count().catch(() => 0)) > 0) {
  await usernameInput.fill(env.THREADS_EMAIL || "mue.menti");
  await pwInput.fill(env.THREADS_PASSWORD || "Rasheed@910").catch(() => {});
  const submit = page
    .locator('button[type="submit"], input[type="submit"], div[role="button"]:has-text("Log in")')
    .first();
  if (await submit.count().catch(() => 0)) await submit.click({ timeout: 10_000 }).catch(() => {});
  else await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);
} else {
  const igBtn = page
    .locator('button:has-text("Continue with Instagram"), div[role="button"]:has-text("Continue with Instagram")')
    .first();
  if (await igBtn.count().catch(() => 0)) {
    await igBtn.click({ timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(4000);
  }
}
if (page.url().includes("instagram.com/accounts/login")) {
  const igUser = page
    .locator('input[name="username"], input[placeholder="Phone number, username, or email"], input[type="text"]')
    .first();
  const igPw = page.locator('input[name="password"], input[type="password"]').first();
  if ((await igUser.count().catch(() => 0)) > 0) {
    await igUser.fill(env.THREADS_EMAIL || "mue.menti");
    await igPw.fill(env.THREADS_PASSWORD || "Rasheed@910").catch(() => {});
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
  const btn = page
    .locator(`div[role="button"]:has-text("${label}"), button:has-text("${label}")`)
    .first();
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
await page.screenshot({ path: `${SHOTS}/c5-post.png` });

const replyBtn = page
  .locator('[aria-label="Reply"], [aria-label="Reply to this post"], [data-testid="reply_button"]')
  .first();
console.log("reply btn count:", await replyBtn.count().catch(() => 0));
await replyBtn.click({ timeout: 15000 }).catch((e) => console.log("reply click fail:", e.message.slice(0, 120)));
await page.waitForTimeout(4000);
await page.screenshot({ path: `${SHOTS}/c5-composer.png` });

const dialog = page.locator('[role="dialog"]');
const hasDialog = (await dialog.count().catch(() => 0)) > 0;
console.log("dialog present:", hasDialog);
if (hasDialog) {
  const labels = await dialog
    .locator('[role="button"], button')
    .evaluateAll((els) =>
      els.map((e) => ({
        text: (e.innerText || "").trim().slice(0, 24),
        aria: e.getAttribute("aria-label"),
        disabled: e.getAttribute("aria-disabled") || e.hasAttribute("disabled"),
      }))
    );
  console.log("dialog buttons:", JSON.stringify(labels));
  console.log("editable count:", await dialog.locator('[contenteditable="true"]').count());
}

console.log("cr chunks captured:", crUrl.size);
if (crUrl.size === 0) {
  const hits = await page.evaluate(async () => {
    const urls = performance.getEntriesByType("resource").map((r) => r.name).filter((u) => u.includes(".js"));
    const out: string[] = [];
    for (const u of urls) {
      try {
        const t = await (await fetch(u)).text();
        if (t.includes('__d("cr:35821"')) out.push(u);
      } catch {}
    }
    return out;
  });
  console.log("in-page cr:35821 defs:", JSON.stringify(hits));
  if (hits.length > 0) {
    const body = await (await page.evaluate((u) => fetch(u).then((r) => r.text()), hits[0])) as string;
    writeFileSync(`${SHOTS}/cr35821-chunk.js`, body);
  }
}

if (existsSync(`${SHOTS}/cr35821-chunk.js`)) {
  const body = readFileSync(`${SHOTS}/cr35821-chunk.js`, "utf8");
  const idx = body.indexOf('__d("cr:35821"');
  console.log("--- cr:35821 module source ---");
  console.log(body.slice(Math.max(0, idx - 500), idx + 3500).replace(/\s+/g, " "));
}

await browser.close();
