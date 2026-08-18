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

const { getSession } = await import("../src/lib/threads/session");

const SHOTS = `${process.cwd()}/scratch/shots`;

async function main() {
  const s = await getSession();
  if (!s) return console.log("no session");
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

  await page.goto("https://www.threads.com/@natalie1326007/post/DcKPyX9DHIW", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(4500);
  const replySel = ['[aria-label="Reply"]', 'svg[aria-label="Reply"]'];
  for (const sel of replySel) {
    const el = page.locator(sel).first();
    if ((await el.count().catch(() => 0)) > 0 && (await el.isVisible().catch(() => false))) {
      await el.click({ timeout: 5000 }).catch(() => {});
      console.log("reply clicked");
      break;
    }
  }
  await page.waitForTimeout(7000);

  const patterns = [
    "postCreationParam",
    "CreatePostMutation",
    "composer_post_create",
    "post_creation",
    "replyToPost",
    "ThreadsCreatePost",
    "BarcelonaComposerPost",
    "composerPostCreate",
    "createThreadsPost",
    "PostCreationParam",
  ];

  const found = await page.evaluate(async (pats) => {
    const out: any[] = [];
    const scripts = Array.from(document.querySelectorAll("script[src]")).map(
      (s) => (s as HTMLScriptElement).src,
    );
    const seen = new Set<string>();
    for (const url of scripts) {
      if (seen.has(url) || !url.startsWith("https://")) continue;
      seen.add(url);
      let text: string;
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        text = await r.text();
      } catch {
        continue;
      }
      for (const p of pats) {
        let i = -1;
        while ((i = text.indexOf(p, i + 1)) >= 0) {
          const win = text.slice(Math.max(0, i - 800), i + 1600);
          const docIds = Array.from(
            win.matchAll(/["']?doc_id["']?\s*[:=]\s*["']?(\d{8,})["']?/g),
          ).map((m) => m[1]);
          out.push({ pat: p, url: url.slice(0, 90), docIds: [...new Set(docIds)].slice(0, 6), window: win.slice(0, 1600) });
        }
      }
    }
    return out;
  }, patterns);

  console.log("total hits:", found.length);
  for (const f of found.slice(0, 20)) {
    console.log("PAT:", f.pat, "| bundle:", f.url, "| docIds:", f.docIds.join(","));
  }
  writeFileSync(`${SHOTS}/bundle-hits.jsonl`, found.map((f) => JSON.stringify(f)).join("\n"));
  console.log("hits saved to bundle-hits.jsonl");
  await browser.close().catch(() => {});
}

main().catch((e) => console.log("FATAL:", e?.message));