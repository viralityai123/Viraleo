import { writeFileSync } from "node:fs";

const r = await fetch("https://static.cdninstagram.com/rsrc.php/v4iwkj4/y1/l/en_GB-j/VS2Af59ea4n.js");
const t = await r.text();
writeFileSync("scratch/shots/cr-bundle.js", t);
console.log("size:", t.length);

const needle = '__d("cr:35821"';
let i = t.indexOf(needle);
console.log("def at:", i);
if (i < 0) {
  let j = -1;
  let n = 0;
  while ((j = t.indexOf("cr:35821", j + 1)) >= 0 && n < 8) {
    console.log("occ", n, "@", j, ":", t.slice(Math.max(0, j - 50), j + 100).replace(/\n/g, " "));
    n++;
  }
} else {
  console.log(t.slice(i, i + 2500));
}