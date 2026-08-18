import { chromium } from "playwright";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-blink-features=AutomationControlled",
  ],
});
const ctx = await browser.newContext({
  userAgent: UA,
  viewport: { width: 1280, height: 800 },
  locale: "en-US",
  timezoneId: "America/New_York",
});
await ctx.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
  Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
  window.chrome = window.chrome || { runtime: {} };
});
const page = await ctx.newPage();

console.log("[probe] goto threads.net/login");
await page.goto("https://www.threads.net/login", { waitUntil: "domcontentloaded", timeout: 45000 });

const btn = page.getByRole("button", { name: /continue with instagram/i });
await btn.waitFor({ timeout: 20000 });
console.log("[probe] clicking Continue with Instagram");
await btn.click();

await page.waitForURL(/instagram\.com/, { timeout: 30000 });
console.log("[probe] on IG login:", page.url().slice(0, 90));

const userField = page.locator('input[name="email"], input[name="username"], input[placeholder*="username" i], input[placeholder*="Username"]').first();
try {
  await userField.waitFor({ timeout: 25000 });
} catch {
  console.log("[probe] NO USERNAME INPUT. url:", page.url().slice(0, 120));
  const inputs = await page.locator("input").all();
  for (const inp of inputs) {
    const info = await inp.evaluate((el) => {
      const a = el as HTMLInputElement;
      return {
        type: a.type,
        name: a.name,
        placeholder: a.placeholder,
        ariaLabel: a.getAttribute("aria-label"),
        id: a.id,
      };
    });
    console.log("[probe] input:", JSON.stringify(info));
  }
  await browser.close();
  process.exit(0);
}
const passField = page.locator('input[name="pass"], input[name="password"], input[type="password"]').first();
await passField.waitFor({ timeout: 20000 });
await userField.fill("mue.menti");
await passField.fill("Rasheed@910");
await passField.press("Enter");
console.log("[probe] submitted, waiting 6s...");
await page.waitForTimeout(6000);
console.log("[probe] url now:", page.url().slice(0, 90));
const fullBody = (await page.locator("body").innerText()).replace(/\s+/g, " ");
console.log("[probe] full body keywords:", (fullBody.match(/.{0,60}(incorrect|error|wrong|problem|suspicious|checkpoint|verify|try again).{0,60}/gi) || []).join(" || "));
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(5000);
  const u = page.url();
  console.log(`[probe] t+${(6 + (i + 1) * 5)}s url:`, u.slice(0, 90));
  if (/threads\.(com|net)\//.test(u)) break;
  const body2 = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200);
  if (/incorrect|checkpoint|verify|suspicious|confirm it.s you/i.test(body2)) {
    console.log("[probe] PAGE ERROR:", body2);
    break;
  }
}
const body = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 300);
console.log("[probe] body:", body);
const cookies = await ctx.cookies();
const sessionid = cookies.find((c) => c.name === "sessionid");
console.log("[probe] sessionid cookie:", sessionid ? sessionid.value.slice(0, 20) + "..." : "NONE");

await browser.close();