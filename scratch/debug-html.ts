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

const { getSession } = await import("../src/lib/threads/session");
const s = await getSession();
if (!s) {
  console.log("no session");
  process.exit(1);
}
const res = await fetch("https://www.threads.com/", {
  headers: {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    cookie: s.cookies,
  },
});
const html = await res.text();
console.log("status", res.status, "len", html.length);
for (const pat of ["LSD", "DTSGInitialData", "jazoest", "__rev", "__hs", "postCreationParam", "composer_session_id", "reply_to", "bootloaded"]) {
  const idx = html.indexOf(pat);
  console.log(pat, "=>", idx >= 0 ? html.slice(idx - 40, idx + 140).replace(/\n/g, " ") : "NOT FOUND");
}
writeFileSync("scratch/shots/home.html", html);
