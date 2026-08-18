import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const c = line.replace(/\r$/, "");
  const m = c.match(/^([^=]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { pollOnce } = await import("../src/lib/threads/monitor");
console.log("[runner] starting pollOnce...");
await pollOnce();
console.log("[runner] cycle done");
process.exit(0);