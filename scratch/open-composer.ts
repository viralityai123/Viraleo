import { chromium } from "playwright";
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";

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

const username = process.argv[2] || "anikonorris";
mkdirSync("scratch/shots", { recursive: true });

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext();
const { getKv } = await import("../src/lib/kv");
const kv = await getKv();
const stored = await kv.get("threads:cookies");
const cookieStr = stored?.cookies || "";
const pairs = cookieStr.split("; ").filter(Boolean).map((p) => {
  const [name, ...rest] = p.split("=");
  return { name, value: rest.join("=") };
});
await ctx.addCookies(
  pairs.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.name.includes("ig_") ? ".instagram.com" : ".threads.net",
    path: "/",
  }))
);
console.log("loaded cookies:", pairs.length);
const page = await ctx.newPage();

page.on("response", async (res) => {
  try {
    if (res.url().includes(".js") || res.url().includes(".mjs")) {
      const body = await res.text().catch(() => "");
      if (body.includes('__d("cr:35821"')) {
        console.log("!!! cr:35821 DEFINITION in:", res.url());
        appendFileSync("scratch/shots/cr35821-found.log", res.url() + "\n");
      }
    }
  } catch {}
});

await page.goto(`https://www.threads.com/@${username}/`, { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(5000);
const postLink = page.locator('a[href*="/post/"]').first();
const href = await postLink.getAttribute("href").catch(() => null);
console.log("post href:", href);
if (!href) {
  await postLink.click({ force: true }).catch(() => {});
  await page.waitForTimeout(5000);
} else {
  await page.goto("https://www.threads.com" + href, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(4000);
}
await page.screenshot({ path: "scratch/shots/c4-post.png" });

const replyBtn = page
  .locator('[aria-label="Reply"], [aria-label="Reply to this post"], [data-testid="reply_button"]')
  .first();
console.log("reply btn count:", await replyBtn.count().catch(() => 0));
await replyBtn.click({ timeout: 15000 }).catch((e) => console.log("reply click fail:", e.message.slice(0, 120)));
await page.waitForTimeout(4000);
await page.screenshot({ path: "scratch/shots/c4-composer.png" });

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
        cls: (e.className || "").toString().slice(0, 40),
      }))
    );
  console.log("dialog buttons:", JSON.stringify(labels, null, 1));
  console.log("editable count:", await dialog.locator('[contenteditable="true"]').count());
}

console.log(
  "scripts total:",
  await page.evaluate(() => performance.getEntriesByType("resource").filter((r) => r.name.includes(".js")).length)
);

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

await browser.close();
