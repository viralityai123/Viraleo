import { readFileSync, writeFileSync } from "node:fs";

function loadEnv() {
  try {
    const txt = readFileSync(".env.local", "utf8");
    for (const line of txt.split("\n")) {
      const clean = line.replace(/\r$/, "");
      const m = clean.match(/^([^=]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnv();
process.env.THREADS_EMAIL = "mue.menti";
process.env.THREADS_PASSWORD = "Rasheed@910";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright") as { chromium: any };

const { getSession, setSession } = await import("../src/lib/threads/session");
const { listQueue } = await import("../src/lib/threads/store");

const SHOTS = `${process.cwd()}/scratch/shots`;

async function main() {
  const s = await getSession();
  if (!s) {
    console.log("no session");
    return;
  }
  const lead = (await listQueue()).find((l: any) => l.username === process.argv[2]);
  const postUrl = lead?.postUrl || (lead ? `https://www.threads.com/@${lead.username}/post/${lead.postId}` : `https://www.threads.com/@${process.argv[2]}`);
  const bestDraft = (lead?.replyDrafts || []).filter((d: string) => Boolean(d && d.length > 10));
  const text =
    bestDraft[2] || bestDraft[1] || bestDraft[0] || process.env.DRAFT_TEXT || "test";
  console.log("drafts:", JSON.stringify(bestDraft.map((d: string) => d.slice(0, 90))));
  console.log("postUrl:", postUrl);
  console.log("draft:", text.slice(0, 120));

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  });
  const cookies = s.cookies.split("; ").map((pair: string) => {
    const [name, ...rest] = pair.split("=");
    return { name, value: rest.join("="), domain: ".threads.com", path: "/" };
  });
  await context.addCookies(cookies);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  const allReq: any[] = [];
  page.on("request", (req: any) => {
    const u = req.url();
    if (req.method() === "POST" && u.includes("/api/graphql")) {
      const pd: string = req.postData() || "";
      const fn = decodeURIComponent(pd.match(/fb_api_req_friendly_name=([^&]*)/)?.[1] || "");
      const docId = pd.match(/doc_id=(\d+)/)?.[1] || "";
      allReq.push({ fn, docId, pd, at: Date.now() });
    }
  });
  page.on("response", async (res: any) => {
    if (res.url().includes("/api/graphql")) {
      const body = await res.text().catch(() => "");
      if (/post_creation|composer|create_threads_post|create_post/i.test(body)) {
        console.log("GRAPHQL RESPONSE (mutation?):", res.status(), body.slice(0, 1000));
      }
    }
  });

  await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${SHOTS}/composer-1-post.png` }).catch(() => {});

  const bodyText = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 400);
  console.log("body:", bodyText);
  const labels = await page
    .evaluate(() =>
      Array.from(document.querySelectorAll("[aria-label]"))
        .map((el) => (el as HTMLElement).getAttribute("aria-label"))
        .filter((l): l is string => Boolean(l)),
    )
    .catch(() => []);
  console.log("aria-labels:", labels.join(" | ").slice(0, 800));
  const btns = await page
    .evaluate(() =>
      Array.from(document.querySelectorAll("button, [role='button'], a"))
        .map((el) => (el as HTMLElement).innerText?.trim().slice(0, 40))
        .filter((t): t is string => Boolean(t)),
    )
    .catch(() => []);
  console.log("buttons:", btns.slice(0, 40).join(" | ").slice(0, 600));

  const replySel = [
    '[aria-label="Reply"]',
    'svg[aria-label="Reply"]',
    'div[role="button"][aria-label*="reply" i]',
    'button[aria-label*="Reply" i]',
  ];
  let clicked = false;
  for (const sel of replySel) {
    const el = page.locator(sel).first();
    if ((await el.count().catch(() => 0)) > 0 && (await el.isVisible().catch(() => false))) {
      await el.click({ timeout: 5000 }).catch(() => {});
      clicked = true;
      console.log("clicked reply via:", sel);
      break;
    }
  }
  if (!clicked) console.log("!! no reply button found");
  await page.waitForTimeout(2500);

  const composer = page
    .locator('[aria-label*="Type to compose"], div[contenteditable="true"], [role="textbox"][contenteditable="true"]')
    .first();
  if ((await composer.count().catch(() => 0)) === 0) {
    console.log("!! composer not found");
    await page.screenshot({ path: `${SHOTS}/composer-2-nocomposer.png` }).catch(() => {});
  } else {
    await composer.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.keyboard.type(text, { delay: 25 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/composer-3-typed.png` }).catch(() => {});

    console.log("pressing Ctrl+Enter to submit");
    await page.keyboard.press("Control+Enter");
    await page.waitForTimeout(12000);
    await page.screenshot({ path: `${SHOTS}/composer-4-after.png` }).catch(() => {});
    const after = (await page.locator("body").innerText().catch(() => ""))
      .replace(/\s+/g, " ")
      .slice(0, 400);
    console.log("after submit body:", after);
  }

  // Save tokens from current page HTML
  const html = await page.content().catch(() => "");
  const grab = (re: RegExp): string => {
    const m = html.match(re);
    return m?.[1] ?? "";
  };
  const tokens: Record<string, string> = {
    lsd: grab(/\["LSD",\[\],\{"token":"([^"]+)"/) || grab(/"LSD":\{"token":"([^"]+)"/),
    fbDtsg: grab(/\["DTSGInitialData",\[\],\{"token":"([^"]+)"/) || grab(/"DTSGInitialData":\{"token":"([^"]+)"/),
    jazoest: grab(/jazoest=(\d+)/),
    spinR: grab(/"__spin_r":(\d+)/),
    spinB: grab(/"__spin_b":"([^"]+)"/),
    spinT: grab(/"__spin_t":(\d+)/),
    rev: grab(/"rev":(\d+)/) || grab(/"__rev":(\d+)/),
  };
  let docId = "";
  let friendlyName = "";
  if (captured?.postData) {
    const pd: string = captured.postData;
    docId = pd.match(/doc_id=(\d+)/)?.[1] || "";
    friendlyName = decodeURIComponent(pd.match(/fb_api_req_friendly_name=([^&]*)/)?.[1] || "");
    const varsM = pd.match(/variables=([^&]*)/);
    if (varsM) writeFileSync(`${SHOTS}/captured-variables.json`, decodeURIComponent(varsM[1]));
    const hs = pd.match(/__hs=([^&]*)/)?.[1] || "";
    if (hs) tokens.hs = decodeURIComponent(hs);
    console.log("doc_id:", docId);
    console.log("friendly name:", friendlyName);
  }

  await setSession({ ...s, ...tokens, docId: docId || s.docId });
  console.log("tokens saved:", Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, v ? "yes" : "NO"])));
  const hits = allReq.filter((r) => /postCreationParam|create_post|create_threads|reply_to|composer_post/i.test(r.pd));
  console.log("mutation candidates:", hits.length);
  for (const h of hits) {
    console.log("FN:", h.fn, "doc_id:", h.docId);
    const varsM = h.pd.match(/variables=([^&]*)/);
    if (varsM) console.log("VARS:", decodeURIComponent(varsM[1]).slice(0, 800));
  }
  writeFileSync(`${SHOTS}/graphql-requests.jsonl`, allReq.map((r) => JSON.stringify({ fn: r.fn, docId: r.docId, pd: r.pd })).join("\n"));
  console.log("all requests logged:", allReq.length);
  await browser.close().catch(() => {});
}

main().catch((e) => console.log("FATAL:", e?.message));
