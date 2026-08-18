import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

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
page.setDefaultTimeout(25_000);

const captured: any[] = [];
page.on("request", (req) => {
  const post = req.postData() || "";
  if (!post.includes("doc_id")) return;
  const vars = decodeURIComponent((post.match(/variables=([^&]*)/) || [])[1] || "");
  const doc = (post.match(/doc_id=(\d+)/) || [])[1];
  const fn = decodeURIComponent((post.match(/fb_api_req_friendly_name=([^&]+)/) || [])[1] || "");
  captured.push({ url: req.url(), doc, fn });
  if (/post|reply|create/i.test(fn) && !/counts/i.test(fn)) {
    writeFileSync(
      `${SHOTS}/mutation-${Date.now()}.json`,
      JSON.stringify({ url: req.url(), doc, fn, vars, post: post.slice(0, 4000) }, null, 1)
    );
    console.log(">>> MUTATION:", fn, "doc:", doc, "url:", req.url());
  }
});

console.log("== login ==");
await page.goto("https://www.threads.net/login", { waitUntil: "domcontentloaded", timeout: 40_000 });
await page.waitForTimeout(3500);

const fillForm = async () => {
  const u = page.locator('input[name="username"], input[placeholder="Username, phone or email"], input[placeholder="Phone number, username, or email"], input[type="text"]').first();
  const p = page.locator('input[name="password"], input[type="password"]').first();
  if ((await u.count().catch(() => 0)) === 0) return false;
  await u.fill(env.THREADS_EMAIL || "mue.menti").catch(() => {});
  await p.fill(env.THREADS_PASSWORD || "Rasheed@910").catch(() => {});
  const sub = page.locator('button[type="submit"], input[type="submit"], div[role="button"]:has-text("Log in"), button:has-text("Log in")').first();
  if (await sub.count().catch(() => 0)) await sub.click({ timeout: 10_000 }).catch(() => {});
  else await page.keyboard.press("Enter");
  await page.waitForTimeout(5000);
  return true;
};

let filled = await fillForm();
if (!filled) {
  const ig = page.locator('button:has-text("Continue with Instagram"), div[role="button"]:has-text("Continue with Instagram")').first();
  if (await ig.count().catch(() => 0)) {
    await ig.click({ timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(4000);
  }
  await fillForm();
}

try {
  await page.waitForURL(/threads\.(net|com)\//, { timeout: 60_000 });
} catch {
  console.log("stuck at:", page.url().slice(0, 120));
  await page.screenshot({ path: `${SHOTS}/c8-login-stuck.png` }).catch(() => {});
}
for (const label of ["Not now", "Not Now", "Skip", "Continue", "Allow", "Yes", "Save info", "Save Info"]) {
  const btn = page.locator(`div[role="button"]:has-text("${label}"), button:has-text("${label}")`).first();
  if (await btn.count().catch(() => 0)) {
    await btn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
  }
}
console.log("after login url:", page.url().slice(0, 100));

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

const replyBtn = page.locator('[aria-label="Reply"], [aria-label="Reply to this post"], [data-testid="reply_button"]').first();
const rc = await replyBtn.count().catch(() => 0);
console.log("reply btn count:", rc);
if (rc > 0) {
  await replyBtn.click({ timeout: 15000 }).catch((e) => console.log("reply click fail:", e.message.slice(0, 120)));
  await page.waitForTimeout(3000);
}

const dialog = page.locator('[role="dialog"]');
const dc = await dialog.count().catch(() => 0);
console.log("dialog count:", dc);
if (dc === 0) {
  console.log("no dialog — dumping buttons on page");
  const btns = await page.locator('[role="button"], button').evaluateAll((els) =>
    els.map((b, i) => ({
      i,
      text: ((b as HTMLElement).innerText || "").trim().slice(0, 24),
      aria: b.getAttribute("aria-label"),
    }))
  );
  console.log(JSON.stringify(btns.filter((b) => /reply|post/i.test(b.text) || /reply|post/i.test(b.aria || "")).slice(0, 12)));
  await browser.close();
  process.exit(1);
}

const editable = page.locator('[contenteditable="true"]').first();
await editable.evaluate((el) => (el as HTMLElement).focus()).catch(() => {});
await page.waitForTimeout(400);
await page.keyboard.type(text, { delay: 12 });
await page.waitForTimeout(1500);

const state = await dialog.evaluateAll((els) => {
  const el = els[0] as HTMLElement;
  const btns = Array.from(el.querySelectorAll('[role="button"], button')).map((b, i) => {
    const r = (b as HTMLElement).getBoundingClientRect();
    return {
      i,
      text: ((b as HTMLElement).innerText || "").trim().slice(0, 24),
      aria: b.getAttribute("aria-label"),
      disabled: b.getAttribute("aria-disabled") || b.hasAttribute("disabled"),
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
    };
  });
  const editor = el.querySelector('[contenteditable="true"]');
  return { buttons: btns, editorText: (editor as HTMLElement)?.innerText || "(empty)" };
});
console.log(JSON.stringify(state));
writeFileSync(`${SHOTS}/dialog-state.json`, JSON.stringify(state, null, 1));
await page.screenshot({ path: `${SHOTS}/c8-typed.png` });

// find the enabled round submit icon: bottom-right, circular, no text
const submit = state.buttons.find((b: any) => b.text === "" && b.disabled === false && b.y > 400 && b.w === b.h) || state.buttons.find((b: any) => b.text === "" && b.disabled === false);
console.log("candidate submit:", JSON.stringify(submit));
if (submit) {
  const b = dialog.locator('[role="button"], button').nth(submit.i);
  await b.click({ timeout: 6000 }).catch((e) => console.log("submit click err:", e.message.slice(0, 100)));
  console.log("clicked submit idx", submit.i);
  await page.waitForTimeout(9000);
}
await page.screenshot({ path: `${SHOTS}/c8-after.png` });

console.log("--- captured:", captured.length);
for (const c of captured) console.log("EVT:", c.fn, "| doc:", c.doc, "|", c.url);

await page.waitForTimeout(2000);
await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(6000);
const bodyText = await page.locator("body").innerText().catch(() => "");
console.log("reply visible on page:", bodyText.includes("world-class"));

await browser.close();
