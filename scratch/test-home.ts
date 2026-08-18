import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const c = line.replace(/\r$/, "");
  const m = c.match(/^([^=]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { getSession } = await import("../src/lib/threads/session");
const s = await getSession();
const res = await fetch("https://www.threads.com/", {
  headers: {
    cookie: s!.cookies,
    "user-agent":
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  },
  redirect: "follow",
  signal: AbortSignal.timeout(30000),
});
const txt = await res.text();
console.log("home ->", res.status, txt.length + "b", "| thread_items:", txt.includes("thread_items"), "| __bbox at:", txt.indexOf("__bbox"));
const idx = txt.indexOf("__bbox");
if (idx > 0) {
  console.log("sample:", txt.slice(idx, idx + 500).replace(/\s+/g, " ").slice(0, 400));
}