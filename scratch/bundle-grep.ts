import { readFileSync } from "node:fs";
const t = readFileSync("scratch/shots/composer-bundle.js", "utf8");

const idx = t.indexOf('__d("BarcelonaComposerSubmitPostUtils"');
if (idx >= 0) {
  console.log("=== submit utils module ===");
  console.log(t.slice(idx, idx + 6000));
} else {
  console.log("module def not found; occurrences:");
  let i = -1;
  let n = 0;
  while ((i = t.indexOf("BarcelonaComposerSubmitPostUtils", i + 1)) >= 0 && n < 8) {
    console.log("---", n, "@", i, ":", t.slice(Math.max(0, i - 80), i + 200).replace(/\n/g, " "));
    n++;
  }
}
console.log("\n=== cr:35821 loose search ===");
let i2 = -1;
let n2 = 0;
while ((i2 = t.indexOf("cr:35821", i2 + 1)) >= 0 && n2 < 6) {
  console.log("--- @", i2, ":", t.slice(Math.max(0, i2 - 120), i2 + 260).replace(/\n/g, " "));
  n2++;
}
