import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const clean = line.replace(/\r$/, "");
  const m = clean.match(/^([^=]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { getSession } = await import("../src/lib/threads/session");
const s = await getSession();
console.log("session:", s ? `id=${s.sessionId?.slice(0, 20)}... cookies len=${s.cookies?.length}` : "NONE");

const cookie = s?.cookies || "";
for (const path of ["/search?q=website%20design", "/tag/websitedesign", "/explore"]) {
  for (const host of ["https://www.threads.com", "https://www.threads.net"]) {
    const res = await fetch(host + path, {
      headers: {
        cookie,
        "user-agent":
          "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
        "accept-language": "en-GB,en;q=0.9",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        referer: "https://www.threads.com/",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
    const txt = await res.text();
    console.log(`${host}${path} -> ${res.status} (${txt.length}b) finalUrl=${res.url.slice(0, 80)}`);
    const idx = txt.indexOf("__bbox");
    console.log("   __bbox at:", idx, "| thread_items:", txt.includes("thread_items"), "| login form:", txt.includes("Log in with Instagram") || txt.includes("continue with instagram"));
    if (idx < 0 && res.status === 200) console.log("   head:", txt.slice(0, 120).replace(/\s+/g, " "));
  }
}