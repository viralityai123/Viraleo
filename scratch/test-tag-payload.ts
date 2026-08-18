import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const c = line.replace(/\r$/, "");
  const m = c.match(/^([^=]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { getSession } = await import("../src/lib/threads/session");
const s = await getSession();
const res = await fetch("https://www.threads.com/tag/websitedesign", {
  headers: {
    cookie: s!.cookies,
    "user-agent":
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    "accept-language": "en-GB,en;q=0.9",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    referer: "https://www.threads.com/",
  },
  signal: AbortSignal.timeout(30000),
});
const txt = await res.text();
for (const key of [
  "thread_items",
  "taken_at",
  "takenAt",
  "shareable_content",
  "post_text",
  "threads_tag_feed",
  "edges",
  "websitedesign",
  "website design",
  "text_post_app_info",
  "node_list",
  "timeline_posts",
]) {
  console.log(key.padEnd(24), "->", txt.split(key).length - 1);
}
const idx = txt.indexOf("websitedesign");
if (idx > 0) {
  console.log("--- context:", txt.slice(idx - 400, idx + 400).replace(/\s+/g, " ").slice(0, 600));
}