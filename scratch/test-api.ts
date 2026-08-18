import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const c = line.replace(/\r$/, "");
  const m = c.match(/^([^=]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { getSession } = await import("../src/lib/threads/session");
const s = await getSession();

const ENDPOINTS = [
  "https://www.threads.net/api/v1/threads/search?q=website%20design&count=20",
  "https://www.threads.net/api/v1/feed/threads?count=20",
  "https://www.threads.net/api/v1/discover/threads?count=20",
  "https://www.threads.com/api/v1/threads/search?q=website%20design&count=20",
];
for (const url of ENDPOINTS) {
  try {
    const res = await fetch(url, {
      headers: {
        cookie: s!.cookies,
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
        "x-ig-app-id": "238260118697367",
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        referer: "https://www.threads.net/",
      },
      signal: AbortSignal.timeout(25000),
    });
    const txt = await res.text();
    console.log(`${url.slice(30, 90)} -> ${res.status} (${txt.length}b)`);
    if (res.ok) {
      try {
        const j = JSON.parse(txt);
        const keys = Object.keys(j).join(",");
        const items = j.data?.threads_items || j.threads || j.data?.threads || j.items || [];
        console.log("   keys:", keys.slice(0, 120), "| items:", Array.isArray(items) ? items.length : "?");
        if (Array.isArray(items) && items.length) console.log("   sample:", JSON.stringify(items[0]).slice(0, 300));
      } catch {
        console.log("   non-JSON:", txt.slice(0, 120));
      }
    }
  } catch (e) {
    console.log(url.slice(30, 90), "ERR:", e instanceof Error ? e.message.slice(0, 80) : String(e));
  }
}