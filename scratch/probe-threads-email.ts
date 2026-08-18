import { chromium } from "playwright";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const candidates = ["Virality.ai123@gmail.com", "mue.menti"];

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-blink-features=AutomationControlled"],
});

for (const loginId of candidates) {
  console.log(`\n===== threads email login as: ${loginId} =====`);
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 800 }, locale: "en-US" });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  await page.goto("https://www.threads.net/login", { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForTimeout(2000);

  const fields = await page.locator("input").all();
  console.log("inputs:", fields.length);
  for (const f of fields) {
    console.log("  ", JSON.stringify(await f.evaluate((el) => ({ type: (el as HTMLInputElement).type, name: (el as HTMLInputElement).name, ph: (el as HTMLInputElement).placeholder }))));
  }

  const textField = page.locator('input[name="username"], input[placeholder*="username" i], input[type="text"], input[type="email"]').first();
  const passField = page.locator('input[type="password"]').first();
  if ((await textField.count().catch(() => 0)) === 0) {
    console.log("no text field — maybe logged in already?");
  } else {
    await textField.fill(loginId);
    await passField.fill("Rasheed@910");
    await passField.press("Enter");
    await page.waitForTimeout(5000);
    const url = page.url();
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const err = (body.match(/.{0,60}(incorrect|error|try again|wrong|invalid|sorry)[^.\n]{0,70}/i) || [""])[0];
    console.log("url:", url.slice(0, 80));
    console.log("error:", err ? err.replace(/\s+/g, " ").slice(0, 150) : "NONE");
    console.log("sessionid:", (await ctx.cookies()).some((c) => c.name === "sessionid") ? "YES" : "no");
  }
  await ctx.close();
}

await browser.close();