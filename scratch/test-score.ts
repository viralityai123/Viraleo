import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const c = line.replace(/\r$/, "");
  const m = c.match(/^([^=]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { scorePost } = await import("../src/lib/threads/scorer");
const r = await scorePost(
  "troywright3282",
  "Anybody out there know how to build a website in my brain I know I can do it but I need help actually building it",
  "web-design",
);
console.log("RESULT:", JSON.stringify(r));
process.exit(0);