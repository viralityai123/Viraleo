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
  await page.waitForTimeout(8000);

  const defs = await page.evaluate(async () => {
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
      const defs: any[] = [];
      const re = /__d\("cr:35821"[\s\S]{0,100}?\)/g;
      let m;
      while ((m = re.exec(text))) defs.push({ start: m.index, snippet: m[0] });
      const ops: any[] = [];
      const re2 = /threadsRelayOperation[\s\S]{0,400}?__d\(/g;
      while ((m = re2.exec(text))) ops.push({ start: m.index, snippet: m[0].slice(0, 400) });
      const replyOp: any[] = [];
      const re3 = /BarcelonaComposerPostButton[A-Za-z_]*\.threads\.graphql[\s\S]{0,4500}?params:\{id:n\([^)]*\)[\s\S]{0,200}?\)/g;
      while ((m = re3.exec(text))) replyOp.push({ start: m.index, snippet: m[0].slice(0, 4500) });
      if (defs.length || ops.length || replyOp.length) {
        out.push({ url: url.slice(0, 100), defs, ops, replyOp });
      }
    }
    return out;
  });

  console.log("bundles with hits:", defs.length);
  for (const b of defs) {
    console.log("URL:", b.url);
    for (const d of b.defs) console.log("DEF:", d.snippet.slice(0, 400));
    for (const o of b.ops) console.log("OP:", o.snippet.slice(0, 300));
    for (const r of b.replyOp) {
      console.log("REPLY OP FULL:");
      writeFileSync(`${SHOTS}/reply-op-window.txt`, r.snippet);
      console.log(r.snippet.slice(0, 4500));
    }
  }
  await browser.close().catch(() => {});
}

main().catch((e) => console.log("FATAL:", e?.message));