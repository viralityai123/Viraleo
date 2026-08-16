import { getCredentials, setSession, clearSessionCache, type ThreadsSession } from "./session";
import { getKv } from "@/lib/kv";
import { sendThreadsAlert } from "@/lib/email";

/** Lazy node-only require; never executes in the browser bundle. */
async function nodeRequire(): Promise<((id: string) => any) | null> {
  if (typeof window !== "undefined") return null;
  try {
    const { createRequire } = await import(/* @vite-ignore */ "node:module");
    return createRequire(import.meta.url);
  } catch {
    return null;
  }
}

const RELOGIN_STATE_KEY = "threads:reloginstate";
const RELOGIN_COOLDOWN_MS = 6 * 60 * 60_000;
const MAX_ATTEMPTS_PER_DAY = 2;

export interface ReloginResult {
  ok: boolean;
  needsManual?: boolean;
  reason?: string;
}

async function getReloginState(): Promise<{ lastAttempt: number; countToday: number; day: string }> {
  try {
    const kv = getKv();
    if (kv) {
      const raw = await kv.get<{ lastAttempt: number; countToday: number; day: string }>(
        RELOGIN_STATE_KEY,
      );
      if (raw) return raw;
    }
  } catch {
    // ignore
  }
  return { lastAttempt: 0, countToday: 0, day: "" };
}

async function setReloginState(s: {
  lastAttempt: number;
  countToday: number;
  day: string;
}): Promise<void> {
  try {
    const kv = getKv();
    if (kv) await kv.set(RELOGIN_STATE_KEY, s);
  } catch {
    // ignore
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function canAttemptRelogin(): Promise<{ allowed: boolean; reason: string }> {
  const creds = await getCredentials();
  if (!creds) return { allowed: false, reason: "no credentials configured" };
  const state = await getReloginState();
  const day = todayKey();
  if (state.day === day && state.countToday >= MAX_ATTEMPTS_PER_DAY) {
    return { allowed: false, reason: `daily cap (${MAX_ATTEMPTS_PER_DAY}) reached` };
  }
  if (Date.now() - state.lastAttempt < RELOGIN_COOLDOWN_MS) {
    const mins = Math.ceil((RELOGIN_COOLDOWN_MS - (Date.now() - state.lastAttempt)) / 60_000);
    return { allowed: false, reason: `cooldown ${mins}min remaining` };
  }
  return { allowed: true, reason: "" };
}

async function markAttempt(): Promise<void> {
  const state = await getReloginState();
  const day = todayKey();
  await setReloginState({
    lastAttempt: Date.now(),
    countToday: state.day === day ? state.countToday + 1 : 1,
    day,
  });
}

async function saveDebugShot(page: unknown, label: string): Promise<void> {
  try {
    const { page: p } = page as { page: { screenshot: (o: { type: string; quality: number }) => Promise<Buffer> } };
    const shot = await p.screenshot({ type: "jpeg", quality: 40 });
    const kv = getKv();
    if (kv && shot.length < 900_000) {
      await kv.set(`threads:debugshot:${label}`, shot.toString("base64"));
    }
  } catch {
    // non-fatal
  }
}

/** Attempts to read a 2FA/verification code from Gmail via IMAP (app password). */
async function readCodeFromGmail(): Promise<string | null> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  try {
    const req = await nodeRequire();
    if (!req) return null;
    const ImapFlow = (req("imapflow") as any).ImapFlow ?? req("imapflow");
    const client = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user, pass }, logger: false });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 10 * 60_000);
      const search = await client.search(
        { since, and: [{ or: [{ from: "no-reply@instagram.com" }, { from: "security@mail.instagram.com" }, { from: "instagram@mail.instagram.com" }] }] },
        { envelope: true, uid: true },
      );
      const uids = search.sort((a, b) => b.uid - a.uid).slice(0, 3);
      for (const uid of uids) {
        const msg = await client.fetchOne(uid, { source: true });
        const text = msg.source?.toString("utf8") || "";
        const m = text.match(/(\b\d{6}\b)/);
        if (m) return m[1];
      }
      return null;
    } finally {
      lock.release();
      await client.logout();
    }
  } catch {
    return null;
  }
}

/** Generates a TOTP code if a secret is configured. */
async function totpCode(): Promise<string | null> {
  const secret = process.env.THREADS_TOTP_SECRET;
  if (!secret) return null;
  try {
    const req = await nodeRequire();
    if (!req) return null;
    const { authenticator } = req("otplib") as {
      authenticator: { generate: (s: string) => string };
    };
    return authenticator.generate(secret.replace(/\s+/g, ""));
  } catch {
    return null;
  }
}

async function typeCode(page: any, code: string): Promise<boolean> {
  try {
    for (const sel of ['input[name="verificationCode"]', 'input[inputmode="numeric"]', 'input[name="code"]']) {
      const input = page.locator(sel).first();
      if (await input.count().catch(() => 0)) {
        await input.fill(code);
        await page.keyboard.press("Enter");
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Logs into Instagram, transfers the session to Threads, and persists the
 * captured cookies to Upstash. Playwright is lazy-imported so the main
 * server bundle stays lean.
 */
export async function reloginThreadsSession(): Promise<ReloginResult> {
  const creds = await getCredentials();
  if (!creds) return { ok: false, reason: "no credentials configured (THREADS_EMAIL/THREADS_PASSWORD)" };

  await markAttempt();

  let browser: any = null;
  try {
    const req = await nodeRequire();
    if (!req) return { ok: false, reason: "node require unavailable" };
    const { chromium } = req("playwright") as { chromium: any };
    browser = await chromium.launch({
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

    console.log("[relogin] navigating to threads.net/login");
    await page.goto("https://www.threads.net/login", { waitUntil: "domcontentloaded", timeout: 40_000 });

    // If already logged in (session persisted from a previous capture), skip straight to capture.
    await page.waitForTimeout(2500);
    const alreadyLoggedIn = await page
      .locator('a[href="/search"], [data-sentry-component="TopNav"]')
      .first()
      .count()
      .catch(() => 0);
    if (!alreadyLoggedIn) {
      // Threads login page: prefer the built-in email form (works for
      // threads-only accounts, e.g. no Instagram account behind them), fall
      // back to the "Continue with Instagram" OAuth flow.
      const igButton = page
        .locator('button:has-text("Continue with Instagram"), [role="button"]:has-text("Continue with Instagram"), a:has-text("Continue with Instagram"), button:has-text("Log in with Instagram"), a:has-text("Log in with Instagram")')
        .first();
      const emailForm = page.locator('input[name="username"], input[placeholder="Username, phone or email"], input[type="text"]').first();
      if (await emailForm.count().catch(() => 0)) {
        console.log("[relogin] using threads email login form");
      } else if (await igButton.count().catch(() => 0)) {
        console.log("[relogin] clicking Log in with Instagram");
        await igButton.click({ timeout: 20_000 });
        await page.waitForTimeout(3000);
      } else {
        console.log("[relogin] no login UI found — trying direct IG login");
        await page.goto("https://www.instagram.com/accounts/login/", {
          waitUntil: "domcontentloaded",
          timeout: 40_000,
        });
      }
    }

    const url = page.url();
    const usernameInput = page.locator('input[name="username"], input[placeholder="Username, phone or email"], input[type="text"]').first();
    if (url.includes("instagram.com/accounts/login") || (await usernameInput.count().catch(() => 0))) {
      console.log("[relogin] filling login form at", page.url());
      await page.waitForSelector('input[name="username"], input[placeholder="Username, phone or email"], input[type="text"]', { timeout: 30_000 });
      await page.fill('input[name="username"], input[placeholder="Username, phone or email"], input[type="text"]', creds.email);
      await page.fill('input[name="password"], input[type="password"]', creds.password);
      const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
      if (await submitBtn.count().catch(() => 0)) {
        await submitBtn.click({ timeout: 10_000 }).catch(() => page.keyboard.press("Enter"));
      } else {
        await page.keyboard.press("Enter");
      }
      await page.waitForLoadState("domcontentloaded").catch(() => {});

      // Possible checkpoint screens
      await page.waitForTimeout(3500);
      const checkpointText = await page.locator("body").innerText().catch(() => "");
      console.log("[relogin] after submit url:", page.url());
      console.log("[relogin] post-submit body:", checkpointText.replace(/\s+/g, " ").slice(0, 400));
      const errMatch = checkpointText.match(/(incorrect|wrong password|can't log|error|try again|sorry|unable|unusual|few minutes|suspicious)[^.\n]{0,80}/i);
      if (errMatch) console.log("[relogin] page says:", errMatch[0].replace(/\s+/g, " "));
      if (/confirm it.s you|checkpoint|enter the code|verification/i.test(checkpointText)) {
        console.log("[relogin] checkpoint detected");
        await saveDebugShot({ page }, "checkpoint");

        let code: string | null = null;
        const totp = await totpCode();
        if (totp) {
          console.log("[relogin] using TOTP code");
          code = totp;
        } else {
          console.log("[relogin] reading code from Gmail IMAP");
          code = await readCodeFromGmail();
        }
        if (code && (await typeCode(page, code))) {
          await page.waitForTimeout(4000);
          console.log("[relogin] code submitted");
        } else {
          await saveDebugShot({ page }, "needsmanual");
          return { ok: false, needsManual: true, reason: "checkpoint requires manual code" };
        }
      }

      // "Save your login info?" / "Turn on notifications" prompts
      for (const label of ["Not now", "Not Now", "Skip"]) {
        const btn = page.locator(`div[role="button"]:has-text("${label}"), button:has-text("${label}")`).first();
        if (await btn.count().catch(() => 0)) {
          await btn.click().catch(() => {});
          await page.waitForTimeout(1200);
        }
      }
    }

    // Let the IG -> OIDC -> Threads redirect chain complete (auto-login).
    try {
      await page.waitForURL(/threads\.(net|com)\//, { timeout: 45_000 });
      console.log("[relogin] back on threads at", page.url());
    } catch {
      // Possibly a consent/prompt screen — click through, then keep waiting.
      for (const label of ["Not now", "Not Now", "Skip", "Continue", "Allow", "Yes"]) {
        const btn = page
          .locator(`div[role="button"]:has-text("${label}"), button:has-text("${label}"), a:has-text("${label}")`)
          .first();
        if (await btn.count().catch(() => 0)) {
          await btn.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(1500);
        }
      }
      try {
        await page.waitForURL(/threads\.(net|com)\//, { timeout: 30_000 });
      } catch {
        console.log("[relogin] never returned to threads — url:", page.url());
      }
    }

    if (!/threads\.(net|com)\//.test(page.url())) {
      await page.goto("https://www.threads.net/", { waitUntil: "domcontentloaded", timeout: 40_000 });
    }
    // Click the IG login link once more if a session now exists (auto-authorize).
    const igButton2 = page
      .locator('button:has-text("Continue with Instagram"), [role="button"]:has-text("Continue with Instagram"), a:has-text("Continue with Instagram"), button:has-text("Log in with Instagram"), a:has-text("Log in with Instagram")')
      .first();
    if (await igButton2.count().catch(() => 0)) {
      await igButton2.click({ timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(5000);
    }

    // Wait for the app shell (search nav link) → logged in.
    await page
      .waitForSelector('a[href="/search"], header, [data-sentry-component="TopNav"]', { timeout: 30_000 })
      .catch(() => {});

    await page.waitForTimeout(3000);
    const cookies = await context.cookies();
    const sessionid = cookies.find((c: any) => c.name === "sessionid");
    const csrftoken = cookies.find((c: any) => c.name === "csrftoken");
    const userId = cookies.find((c: any) => c.name === "ds_user_id");

    if (!sessionid || !csrftoken) {
      console.log("[relogin] no session — url:", page.url());
      const bodyText = (await page.locator("body").innerText().catch(() => "")).slice(0, 600);
      console.log("[relogin] body text:", bodyText.replace(/\s+/g, " "));
      await saveDebugShot({ page }, "nosession");
      return { ok: false, reason: "login flow completed but no sessionid cookie captured" };
    }

    const s: ThreadsSession = {
      cookies: cookies.map((c: any) => `${c.name}=${c.value}`).join("; "),
      sessionId: sessionid.value,
      csrfToken: csrftoken.value,
      userId: userId?.value || "",
      ts: Date.now(),
    };
    await setSession(s);
    clearSessionCache();
    console.log("[relogin] session captured OK");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[relogin] failed:", msg);
    return { ok: false, reason: msg };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/** Auto-relogin guard used by the monitor: respects cooldown + daily cap. */
export async function maybeAutoRelogin(): Promise<void> {
  const { allowed, reason } = await canAttemptRelogin();
  if (!allowed) {
    console.log(`[relogin] auto-trigger skipped: ${reason}`);
    return;
  }
const result = await reloginThreadsSession();
  console.log(`[relogin] auto-trigger result: ${JSON.stringify(result)}`);
  if (result.needsManual) {
    try {
      await sendThreadsAlert(
        "Threads relogin needs manual code",
        "The auto-login hit a verification checkpoint. Provide a code (or set GMAIL_APP_PASSWORD / THREADS_TOTP_SECRET to automate).",
      );
    } catch {
      // ignore
    }
  }
}