import { chromium } from "playwright";
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
const USERNAME = env.THREADS_USERNAME || "mue.menti";
const PASSWORD = env.THREADS_PASSWORD || "Rasheed@910";

const username = process.argv[2] || "anikonorris";
const text =
  "I've taken 10+ startups from idea to launch, making complex site builds feel effortless. I can define your exact scope in 2 min – send me the details?";
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

const entries = [];
page.on("request", (req) => {
  const url = req.url();
  if (url.includes("/graphql/") || url.includes("/api/")) {
    const post = req.postData() || "";
    const vars = (post.match(/variables=([^&]*)/) || [])[1];
    let parsed = null;
    try { parsed = vars ? JSON.parse(decodeURIComponent(vars)) : null; } catch {}
    const doc = (post.match(/doc_id=(\d+)/) || [])[1];
    const fn = (post.match(/fb_api_req_friendly_name=([^&]+)/) || [])[1];
    entries.push({ fn: fn ? decodeURIComponent(fn) : "?", doc: doc || "?", vars: parsed, url });
  }
});
page.on("response", async (res) => {
  try {
    if (res.url().includes(".js") || res.url().includes(".mjs")) {
      const body = await res.text().catch(() => "");
      if (body.includes("cr:35821")) {
        appendFileSync("scratch/shots/cr35821-found.log", res.url() + "\n");
        console.log("!!! cr:35821 FOUND in:", res.url());
        const idx = body.indexOf("cr:35821");
        console.log(body.slice(Math.max(0, idx - 300), idx + 900));
      }
    }
  } catch {}
});

const url = `https://www.threads.com/@${username}/`;
try {
  await page.goto(url, { waitUntil: "domcontentloaded" });
} catch (e) {
  console.log("goto error:", e.message?.slice(0, 150));
}
await page.waitForTimeout(5000);
await page.screenshot({ path: "scratch/shots/c3-page.png", fullPage: false });

const postLink = page.locator('a[href*="/post/"]').first();
const href = await postLink.getAttribute("href").catch(() => null);
console.log("post href:", href);
if (href) {
  await page.goto("https://www.threads.com" + href, { waitUntil: "domcontentloaded" }).catch((e) => console.log("goto2 err:", e.message?.slice(0, 100)));
  await page.waitForTimeout(4500);
} else {
  await postLink.click({ force: true }).catch(() => {});
  await page.waitForTimeout(4500);
}

const reply = page.locator('[aria-label="Reply"]').first();
await reply.click();
await page.waitForTimeout(3500);
console.log("--- after reply click ---");
await page.screenshot({ path: "scratch/shots/c3-composer.png" });

const dialog = page.locator('[role="dialog"]');
const hasDialog = (await dialog.count().catch(() => 0)) > 0;
console.log("dialog present:", hasDialog);

if (hasDialog) {
  const btns = await dialog.locator('[role="button"]').allInnerTexts().catch(() => []);
  const labels = await dialog.locator('[role="button"]').evaluateAll((els) =>
    els.map((e) => ({
      text: (e.innerText || "").trim().slice(0, 30),
      aria: e.getAttribute("aria-label"),
      testid: e.getAttribute("data-testid"),
    }))
  );
  console.log("dialog buttons:", JSON.stringify(labels, null, 1));
}

const editable = page.locator('[contenteditable="true"]').first();
console.log("editable count:", await page.locator('[contenteditable="true"]').count());
await editable.click();
await page.waitForTimeout(600);
await page.keyboard.type(text, { delay: 25 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "scratch/shots/c3-typed.png" });

console.log("--- scripts loaded:", (await page.evaluate(() => performance.getEntriesByType("resource").filter(r => r.name.includes(".js")).length)));
const hits = await page.evaluate(async () => {
  const urls = performance.getEntriesByType("resource").map((r) => r.name).filter((u) => u.includes(".js"));
  const out = [];
  for (const u of urls) {
    try {
      const t = await (await fetch(u)).text();
      if (t.includes("cr:35821")) {
        const i = t.indexOf('__d("cr:35821"');
        out.push({ u, i });
      }
    } catch {}
  }
  return out;
});
console.log("in-page cr:35821 definition hits:", JSON.stringify(hits));

const candidate = dialog.locator('[role="button"]:has-text("Post")').first();
console.log("dialog Post candidate count:", await candidate.count().catch(() => 0));
await candidate.click({ timeout: 6000 }).catch((e) => console.log("click fail:", e.message.slice(0, 120)));
await page.waitForTimeout(9000);
await page.screenshot({ path: "scratch/shots/c3-after-post.png" });

console.log("--- captured graphql entries:", entries.length);
for (const e of entries) {
  if (e.fn.includes("Composer") || e.fn.includes("Post") || e.fn.includes("Mutation")) {
    console.log("EVT:", e.fn, "doc:", e.doc);
    if (e.vars && e.vars.postCreationParam) console.log("  creationParam keys:", Object.keys(e.vars.postCreationParam).join(","));
    if (e.vars) console.log("  vars keys:", Object.keys(e.vars).join(","));
  }
}
appendFileSync("scratch/shots/graphql-requests.jsonl", JSON.stringify(entries, null, 1) + "\n");

await page.waitForTimeout(2000);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);
const bodyText = await page.locator("body").innerText().catch(() => "");
console.log("reply visible on page:", bodyText.includes("2 min"));

await browser.close();
