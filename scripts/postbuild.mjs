import { readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, "..");

const funcDir = join(root, ".vercel", "output", "functions", "__server.func");

// 1. Fix lazyService — keep full module so .fetch() works
const indexPath = join(funcDir, "index.mjs");
let index = readFileSync(indexPath, "utf8");
const origLazy = `promise = loader().then((_mod) => mod = _mod.default || _mod);`;
const fixedLazy = `promise = loader().then((_mod) => mod = _mod.fetch ? _mod : _mod.default || _mod);`;
if (index.includes(origLazy)) {
  index = index.replace(origLazy, fixedLazy);
  writeFileSync(indexPath, index, "utf8");
  console.log("[postbuild] Fixed lazyService in index.mjs");
} else {
  console.log("[postbuild] WARN: lazyService pattern not found, skipping");
}

// 2. Fix vc-config runtime to nodejs22.x
const vcPath = join(funcDir, ".vc-config.json");
const vc = JSON.parse(readFileSync(vcPath, "utf8"));
if (vc.runtime !== "nodejs22.x") {
  vc.runtime = "nodejs22.x";
  writeFileSync(vcPath, JSON.stringify(vc, null, 2) + "\n", "utf8");
  console.log("[postbuild] Fixed .vc-config.json runtime to nodejs22.x");
} else {
  console.log("[postbuild] .vc-config.json runtime already nodejs22.x");
}

// 3. Ping search engines
console.log("[postbuild] Pinging search engines...");
await import("./ping-search-engines.mjs");

