import { getCredentials, setSession, clearSessionCache } from "../src/lib/threads/session";
import { getKv } from "../src/lib/kv";

import { readFileSync } from "node:fs";

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
const SHOTS = `${process.cwd()}/scratch/shots`;

async function dump(page: any, label: string) {
  try {
    const url = page.url();
    const body = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
    console.log(`[${label}] url=${url}`);
    console.log(`[${label}] body=${body}`);
    await page.screenshot({ path: `${SHOTS}/${label}.png` }).catch(() => {});
  } catch (e) {
    console.log(`[${label}] dump failed:`, e?.message);
  }
}

async function tryCheckpoint(page: any): Promise<boolean> {
  await page.waitForTimeout(3000);
  const body = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
  if (/confirm it.s you|checkpoint|enter the code|verification|two.factor/i.test(body)) {
    console.log("[checkpoint detected] — needs manual code, aborting");
    await page.screenshot({ path: `${SHOTS}/checkpoint.png` }).catch(() => {});
    return false;
  }
  return true;
}

async function main() {
  const creds = await getCredentials();
  if (!creds) {
    console.log("FAIL: no credentials in env or KV");
    return;
  }
  const kv = getKv();
  console.log("kv ready:", Boolean(kv), "email:", creds.email);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25_000);

  console.log("== attempt: threads.net/login ==");
  await page.goto("https://www.threads.net/login", { waitUntil: "domcontentloaded", timeout: 40_000 });
  await page.waitForTimeout(3500);

  const usernameInput = page
    .locator('input[name="username"], input[placeholder="Username, phone or email"], input[type="text"]')
    .first();
  const pwInput = page.locator('input[name="password"], input[type="password"]').first();
  const hasForm = (await usernameInput.count().catch(() => 0)) > 0;

  if (hasForm) {
    console.log("email form found — filling");
    await usernameInput.fill(creds.email);
    await pwInput.fill(creds.password).catch(() => {});
    const submit = page
      .locator('button[type="submit"], input[type="submit"], div[role="button"]:has-text("Log in")')
      .first();
    if (await submit.count().catch(() => 0)) await submit.click({ timeout: 10_000 }).catch(() => {});
    else await page.keyboard.press("Enter");
    await page.waitForTimeout(4000);
    if (!(await tryCheckpoint(page))) return;
  } else {
    console.log("no direct form — clicking 'Log in with Instagram'");
  }

  // Ensure we're at the IG login (either via redirect or button click)
  if (!page.url().includes("instagram.com/accounts/login")) {
    const igBtn = page
      .locator(
        'button:has-text("Log in with Instagram"), a:has-text("Log in with Instagram"), div[role="button"]:has-text("Log in with Instagram"), button:has-text("Continue with Instagram")',
      )
      .first();
    if (await igBtn.count().catch(() => 0)) {
      console.log("clicking IG login");
      await igBtn.click({ timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(4000);
    }
  }

  if (page.url().includes("instagram.com/accounts/login")) {
    console.log("== attempt: instagram.com login ==");
    await dump(page, "ig-login");
    const igUser = page
      .locator('input[name="username"], input[placeholder="Phone number, username, or email"], input[type="text"]')
      .first();
    const igPw = page.locator('input[name="password"], input[type="password"]').first();
    if ((await igUser.count().catch(() => 0)) > 0) {
      await igUser.fill(creds.email);
      await igPw.fill(creds.password).catch(() => {});
      const sub = page.locator('button[type="submit"], div[role="button"]:has-text("Log in")').first();
      if (await sub.count().catch(() => 0)) await sub.click({ timeout: 10_000 }).catch(() => {});
      else await page.keyboard.press("Enter");
      await page.waitForTimeout(5000);
      await dump(page, "ig-after-submit");
      if (!(await tryCheckpoint(page))) return;
    }
  }

  // Wait for the redirect chain back to Threads
  try {
    await page.waitForURL(/threads\.(net|com)\//, { timeout: 45_000 });
  } catch {
    console.log("never returned to threads");
  }
  // Click any consent prompts
  for (const label of ["Not now", "Not Now", "Skip", "Continue", "Allow", "Yes"]) {
    const btn = page
      .locator(`div[role="button"]:has-text("${label}"), button:has-text("${label}"), a:has-text("${label}")`)
      .first();
    if (await btn.count().catch(() => 0)) {
      await btn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }
  }

  await page.goto("https://www.threads.net/", { waitUntil: "domcontentloaded", timeout: 40_000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await dump(page, "final");

  // Validation: logged-in shell must be visible + real session cookie
  const shellVisible =
    (await page.locator('a[href="/search"], [data-sentry-component="TopNav"]').first().count().catch(() => 0)) > 0;
  const cookies = await context.cookies();
  const sessionid = cookies.find((c: any) => c.name === "sessionid");
  const csrftoken = cookies.find((c: any) => c.name === "csrftoken");
  const dsUserId = cookies.find((c: any) => c.name === "ds_user_id");
  console.log(
    "validation: shell=",
    shellVisible,
    "sessionid=",
    Boolean(sessionid),
    "ds_user_id=",
    Boolean(dsUserId),
    "url=",
    page.url(),
  );

  if (!sessionid || !shellVisible) {
    console.log("FAIL: no valid logged-in session captured");
    return;
  }

  // --- web-publish tokens: lsd, fb_dtsg, jazoest, spin, rev, hs, composer doc_id ---
  const html = await page.content().catch(() => "");
  const grab = (re: RegExp): string => {
    const m = html.match(re);
    return m?.[1] ?? "";
  };
  const tokens: Record<string, string> = {
    lsd: grab(/"LSD",\s*\["token",[^\]]*?"([^"]+)"/) || grab(/"LSD":\{"token":"([^"]+)"/),
    fbDtsg: grab(/"DTSGInitialData":\{"token":"([^"]+)"/),
    jazoest: grab(/"jazoest":"(\d+)"/),
    spinR: grab(/"__spin_r":(\d+)/),
    spinB: grab(/"__spin_b":"([^"]+)"/),
    spinT: grab(/"__spin_t":(\d+)/),
    rev: grab(/"__rev":(\d+)/),
    hs: grab(/"__hs":"([^"]+)"/),
  };
  console.log("tokens found:", Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, v ? "yes" : "NO"])));

  // composer doc_id: scan the web app bundle (same origin fetch via page.evaluate)
  let docId = "";
  try {
    docId = await page.evaluate(async () => {
      const scripts = Array.from(document.querySelectorAll("script[src]"))
        .map((s) => (s as HTMLScriptElement).src)
        .filter((u) => u.includes("static.cdninstagram.com") || u.includes(".js"));
      const seen = new Set<string>();
      for (const url of scripts) {
        if (seen.has(url)) continue;
        seen.add(url);
        let text: string;
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          text = await r.text();
        } catch {
          continue;
        }
        if (!text.includes("postCreationParam")) continue;
        const patterns = [
          /postCreationParam.{0,3000}?["']doc_id["']\s*[:=]?\s*["']?(\d{8,})["']?/s,
          /ThreadsCreatePostMutation.{0,3000}?["']?id["']?\s*[:=]\s*["'](\d{8,})["']/s,
        ];
        for (const p of patterns) {
          const m = text.match(p);
          if (m) return m[1];
        }
      }
      return "";
    });
  } catch {
    docId = "";
  }
  console.log("composer doc_id:", docId || "NOT FOUND (will be re-scanned at publish time)");

  const s = {
    cookies: cookies.map((c: any) => `${c.name}=${c.value}`).join("; "),
    sessionId: sessionid.value,
    csrfToken: csrftoken?.value || "",
    userId: dsUserId?.value || "",
    ts: Date.now(),
    ...tokens,
    docId: docId || undefined,
  };
  await setSession(s);
  clearSessionCache();
  console.log("SESSION SAVED: uid=", s.userId);
  try {
    await context.storageState({ path: `${process.cwd()}/scratch/shots/storage-state.json` });
    console.log("storageState saved");
  } catch (e: any) {
    console.log("storageState save failed:", e?.message);
  }
  await browser.close().catch(() => {});
}

main().catch((e) => console.log("FATAL:", e?.message));
