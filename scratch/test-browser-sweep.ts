import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const c = line.replace(/\r$/, "");
  const m = c.match(/^([^=]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { searchKeyword } = await import("../src/lib/threads/fetcher");

const keywords = [
  "website design",
  "website designer",
  "logo design",
  "branding",
  "web designer",
  "need a website",
];

for (const kw of keywords) {
  try {
    const r = await searchKeyword(kw, 0);
    console.log(`"${kw}" -> ${r.posts.length} posts (source=${r.source} blocked=${r.blocked})`);
    for (const p of r.posts.slice(0, 2)) {
      console.log("   ", (p.username || "?").padEnd(20), p.text.slice(0, 80).replace(/\s+/g, " "));
    }
  } catch (e) {
    console.log(`"${kw}" -> ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }
}
console.log("done");
process.exit(0);