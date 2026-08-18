import { readFileSync } from "node:fs";

function loadEnv() {
  const txt = readFileSync(".env.local", "utf8");
  for (const line of txt.split("\n")) {
    const m = line.replace(/\r$/, "").match(/^([^=]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

const pw = (await import("playwright")).default || (await import("playwright"));
const browser = await pw.chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://www.threads.net/login", { waitUntil: "domcontentloaded", timeout: 40000 });
await page.waitForTimeout(4000);
console.log("URL:", page.url());
const html = await page.content();
console.log("has instagram link:", /instagram\.com/i.test(html));
const igMatches = html.match(/[^"']*instagram\.com[^"']*/gi)?.slice(0, 8);
console.log("IG refs:", JSON.stringify(igMatches));
const forms = await page.locator("form").count();
console.log("forms:", forms);
const allClickables = await page.locator("button, [role=button], a, span").evaluateAll((els) =>
  els
    .map((e) => {
      const t = (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50);
      const h = e.getAttribute("href") || "";
      return t ? `${t} | ${h.slice(0, 60)}` : "";
    })
    .filter(Boolean)
    .slice(0, 40),
);
console.log("CLICKABLES:", JSON.stringify(allClickables, null, 1));
await browser.close();