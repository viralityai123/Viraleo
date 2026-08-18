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
page.on("request", (req) => {
  const post = req.postData() || "";
  if (!post.includes("doc_id")) return;
  const fn = decodeURIComponent((post.match(/fb_api_req_friendly_name=([^&]+)/) || [])[1] || "");
  const doc = (post.match(/doc_id=(\d+)/) || [])[1];
  const vars = decodeURIComponent((post.match(/variables=([^&]*)/) || [])[1] || "");
  if (/submit|create|reply/i.test(fn)) {
    console.log(">>> SUBMIT-LIKE:", fn, "doc:", doc, req.url());
    console.log("vars:", vars.slice(0, 1200));
  }
});

await page.goto("https://www.threads.com/@myrasharma808/post/DcL1LRtEUB0", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(8000);
const text = await page.locator("body").innerText().catch(() => "");
console.log("has winning:", text.includes("winning"));
console.log("has mue.menti:", text.includes("mue.menti"));
const idx = text.indexOf("winning");
if (idx >= 0) console.log("ctx:", text.slice(Math.max(0, idx - 200), idx + 200).replace(/\s+/g, " "));
await browser.close();