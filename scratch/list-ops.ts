import { readFileSync } from "node:fs";
const t = readFileSync("scratch/shots/cr-bundle.js", "utf8");

const re = /__d\("([\w$]+)_threadsRelayOperation",\[\],\(function\(t,n,r,o,a,i\)\{a\.exports="(\d+)"\}\)/g;
let m;
const out: string[] = [];
while ((m = re.exec(t))) out.push(`${m[1]} = ${m[2]}`);
console.log(out.join("\n"));

const mutations = t.match(/operationKind:"mutation"/g)?.length ?? 0;
console.log("\nmutation ops total:", mutations);

const idx = t.indexOf("xdt_text_app");
console.log("\nxdt_text_app refs:", (t.match(/xdt_text_app_\w+/g) || []).join(", "));
