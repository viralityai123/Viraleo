import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const SHOTS = "scratch/shots";
mkdirSync(SHOTS, { recursive: true });
const username = process.argv[2] || "kathylonor";
const text =
  "I've built 10+ winning websites for founders – yours has real potential. Want me to send a few links so you can see the quality?";

const { chromium } = await import("playwright");
const browser = await chromium.launch({
  headless: false,
  args: ["--disable-blink-features=AutomationControlled"],
});
const context = await browser.newContext({
  storageState: `${SHOTS}/storage-state.json`,
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  viewport: { width: 1280, height: 800 },
  locale: "en-US",
});
const page = await context.newPage();
page.setDefaultTimeout(25_000);

const captured: any[] = [];
const jsonl = `${SHOTS}/graphql-all.jsonl`;
writeFileSync(jsonl, "");
page.on("request", (req) => {
  const post = req.postData() || "";
  if (!post.includes("doc_id")) return;
  const vars = decodeURIComponent((post.match(/variables=([^&]*)/) || [])[1] || "");
  const doc = (post.match(/doc_id=(\d+)/) || [])[1];
  const fn = decodeURIComponent((post.match(/fb_api_req_friendly_name=([^&]+)/) || [])[1] || "");
  captured.push({ url: req.url(), doc, fn, vars });
  writeFileSync(jsonl, JSON.stringify({ url: req.url(), doc, fn, vars, post: post.slice(0, 9000) }) + "\n", { flag: "a" });
  console.log("REQ:", fn, "doc:", doc, req.url());
  if (/post|reply|create|compose/i.test(fn) && !/counts|presence|screen/i.test(fn)) {
    writeFileSync(
      `${SHOTS}/mutation-${doc}.json`,
      JSON.stringify({ url: req.url(), doc, fn, vars, post }, null, 1)
    );
    console.log(">>> MUTATION CAPTURED:", fn, "doc:", doc, req.url());
  }
});

await page.goto(`https://www.threads.com/@${username}/`, { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(9000);
const postLink = page.locator('a[href*="/post/"]').first();
const href = await postLink.getAttribute("href").catch(() => null);
console.log("post href:", href);
if (!href) {
  const loginDiag = await page.locator('text=Continue with Instagram').count().catch(() => 0);
  console.log("session NOT effective (login dialog present:", loginDiag > 0, ")");
  await browser.close();
  process.exit(1);
}

await page.goto("https://www.threads.com" + href, { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(4000);

const replyBtn = page.locator('[aria-label="Reply"], [aria-label="Reply to this post"], [data-testid="reply_button"]').first();
const rc = await replyBtn.count().catch(() => 0);
console.log("reply btn count:", rc);
if (rc === 0) {
  await browser.close();
  process.exit(1);
}
await replyBtn.click({ timeout: 15000 }).catch((e) => console.log("reply click fail:", e.message.slice(0, 120)));
await page.waitForTimeout(3500);

const editable = page.locator('[contenteditable="true"]').first();
const ec = await editable.count().catch(() => 0);
console.log("editable count:", ec);
if (ec === 0) {
  await browser.close();
  process.exit(1);
}
await editable.evaluate((el) => (el as HTMLElement).focus()).catch(() => {});
await page.waitForTimeout(400);
await page.keyboard.type(text, { delay: 12 });
await page.waitForTimeout(1500);

const editorText = await page
  .locator('[contenteditable="true"]')
  .first()
  .evaluate((el) => (el as HTMLElement).innerText)
  .catch(() => "");
console.log("editor text length:", editorText.length, "| matches:", editorText.includes("winning"));

const dialog2 = page.locator('[role="dialog"]');
const postBtn = dialog2.locator('[role="button"]:has-text("Post")').last();
const disabledNow = await postBtn.getAttribute("aria-disabled").catch(() => null);
console.log("dialog Post aria-disabled:", disabledNow);

await page.keyboard.press("Enter");
console.log("pressed Enter");
await page.waitForTimeout(9000);

if (captured.length === 0) {
  console.log("no mutation after Enter — clicking Post");
  await postBtn.click({ timeout: 6000 }).catch((e) => console.log("post click err:", e.message.slice(0, 100)));
  await page.waitForTimeout(9000);
}
await page.screenshot({ path: `${SHOTS}/c11-after.png` });

const allBtns = await page.locator('[role="button"], button').evaluateAll((els) =>
  els.map((b, i) => {
    const r = (b as HTMLElement).getBoundingClientRect();
    return {
      i,
      text: ((b as HTMLElement).innerText || "").trim().slice(0, 24),
      aria: b.getAttribute("aria-label"),
      disabled: b.getAttribute("aria-disabled") || b.hasAttribute("disabled"),
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
    };
  })
);
writeFileSync(`${SHOTS}/all-buttons.json`, JSON.stringify(allBtns, null, 1));
const postish = allBtns.filter((b: any) => /post/i.test(b.text) || /post/i.test(b.aria || "") || b.text === "");
console.log(JSON.stringify(postish.slice(-25)));

const postBtns = allBtns.filter(
  (b: any) => b.text === "Post" && !b.disabled && b.w > 40 && b.h > 25 && b.x > 400
);
console.log("Post candidates:", JSON.stringify(postBtns));
const submit = postBtns[postBtns.length - 1] || null;
console.log("submit candidate:", JSON.stringify(submit));
if (submit) {
  const b = page.locator('[role="button"], button').nth(submit.i);
  await b.click({ timeout: 6000 }).catch((e) => console.log("submit click err:", e.message.slice(0, 100)));
  console.log("clicked submit idx", submit.i);
  await page.waitForTimeout(10000);
}
await page.screenshot({ path: `${SHOTS}/c10-after.png` });

console.log("--- captured:", captured.length);
for (const c of captured) console.log("EVT:", c.fn, "| doc:", c.doc, "|", c.url);

await page.waitForTimeout(2000);
await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(6000);
const bodyText = await page.locator("body").innerText().catch(() => "");
console.log("reply visible on page:", bodyText.includes("portfolio links"));

await browser.close();
