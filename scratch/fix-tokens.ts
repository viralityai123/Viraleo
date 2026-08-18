import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

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

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext();
const { getKv } = await import("../src/lib/kv");
const kv = await getKv();
const stored = await kv.get("threads:cookies");
const pairs = (stored.cookies || "").split("; ").filter(Boolean).map((p) => {
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
const page = await ctx.newPage();

await page.goto("https://www.threads.com/@anikonorris/post/DcJ5i6LlD7k", {
  waitUntil: "domcontentloaded",
}).catch(() => {});
await page.waitForTimeout(6000);
const html = await page.content();
writeFileSync("scratch/shots/post-page.html", html);
console.log("html len:", html.length);

function grab(re: RegExp, label: string) {
  const m = html.match(re);
  console.log(label, "=>", m ? m[1].slice(0, 80) : "NO");
  return m ? m[1] : null;
}

const lsd = grab(/\["LSD",\[\],\{"token":"([^"]+)"\}\]/, "lsd");
const dtsg = grab(/\["DTSGInitialData",\[\],\{"token":"([^"]+)"\}\]/, "fbDtsg");
const jazoest = grab(/jazoest=(\d+)/, "jazoest");
const rev = grab(/"rev":(\d+)/, "rev");
const hs = grab(/20683\.HYP:[^"\\]+/, "hs");

const spinR = html.match(/\["SpinSiteData"[\s\S]*?"spin_r":(\d+)/)?.[1] ?? stored.spinR;
const spinB = html.match(/\["SpinSiteData"[\s\S]*?"spin_b":(\d+)/)?.[1] ?? stored.spinB;
const spinT = html.match(/\["SpinSiteData"[\s\S]*?"spin_t":(\d+)/)?.[1] ?? stored.spinT;

const updated = {
  ...stored,
  lsd: lsd || stored.lsd,
  fbDtsg: dtsg || stored.fbDtsg,
  jazoest: jazoest || stored.jazoest,
  rev: rev || stored.rev,
  hs: hs || stored.hs,
  spinR,
  spinB,
  spinT,
  ts: Date.now(),
};
await kv.set("threads:cookies", updated);
console.log("saved tokens: lsd=", updated.lsd ? "yes" : "NO", "dtsg=", updated.fbDtsg ? "yes" : "NO", "jazoest=", updated.jazoest ? "yes" : "NO", "rev=", updated.rev ? "yes" : "NO", "hs=", updated.hs ? "yes" : "NO");
await browser.close();
