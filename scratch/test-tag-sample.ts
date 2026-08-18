import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const c = line.replace(/\r$/, "");
  const m = c.match(/^([^=]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { searchTag } = await import("../src/lib/threads/fetcher");
const { hasBuyingIntent } = await import("../src/lib/threads/taxonomy");

for (const kw of ["website design", "logo design"]) {
  const r = await searchTag(kw);
  console.log(`\n===== tag ${kw}: ${r.posts?.length ?? 0} posts =====`);
  for (const p of (r.posts || []).slice(0, 15)) {
    const m = hasBuyingIntent(p.text || "");
    console.log(`[${m ?? "x"}] ${(p.username || "?").padEnd(18)} ${(p.text || "").replace(/\s+/g, " ").slice(0, 90)}`);
  }
}
process.exit(0);