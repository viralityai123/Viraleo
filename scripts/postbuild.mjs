import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, "..");

const funcDir = join(root, ".vercel", "output", "functions", "__server.func");
const funcIndexPath = join(funcDir, "index.mjs");

if (!existsSync(funcIndexPath)) {
  console.log("[postbuild] No Vercel build found — skipping Vercel fixes");
} else {
  // 1. Fix lazyService — keep full module so .fetch() works
  let index = readFileSync(funcIndexPath, "utf8");
  const origLazy = `promise = loader().then((_mod) => mod = _mod.default || _mod);`;
  const fixedLazy = `promise = loader().then((_mod) => mod = _mod.fetch ? _mod : _mod.default || _mod);`;
  if (index.includes(origLazy)) {
    index = index.replace(origLazy, fixedLazy);
    writeFileSync(funcIndexPath, index, "utf8");
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
}

// 3. Fix node-server preset build (local runs + Koyeb): lazyService unwrap +
//    boot warm-up so top-level side effects (Threads monitor) start on boot.
const nsDir = join(root, ".output", "server");
if (existsSync(join(nsDir, "index.mjs"))) {
  const nsIndexPath = join(nsDir, "index.mjs");
  let ns = readFileSync(nsIndexPath, "utf8");
  let changed = false;
  const replaceOnce = (from, to) => {
    if (ns.includes(from)) {
      ns = ns.split(from).join(to);
      changed = true;
    }
  };
  replaceOnce(
    "return mod.fetch(req);",
    'return typeof mod === "function" ? mod(req) : mod.fetch(req);',
  );
  replaceOnce(
    "return promise.then((mod2) => mod2.fetch(req));",
    'return promise.then((mod2) => typeof mod2 === "function" ? mod2(req) : mod2.fetch(req));',
  );
  const ssrDir = join(nsDir, "_ssr");
  const entryMatch = ns.match(/import\("\.\/_ssr\/(index-[A-Za-z0-9_-]+\.mjs)"\)/);
  if (entryMatch) {
    const entry = entryMatch[1];
    ns = ns.replace(
      /setTimeout\(\(\) => import\("\.\/_ssr\/index-[A-Za-z0-9_-]+\.mjs"\)\.catch\(\(\) => \{\}\), 1500\);\n?/,
      "",
    );
    ns += `\nsetTimeout(() => import("./_ssr/${entry}").catch(() => {}), 1500);\n`;
    changed = true;
  }
  if (changed) {
    writeFileSync(nsIndexPath, ns, "utf8");
    console.log("[postbuild] Fixed node-server index.mjs (lazyService + boot warm-up)");
  } else {
    console.log("[postbuild] node-server index.mjs already fixed, skipping");
  }
}

// 3. Ping search engines
if (process.env.POSTBUILD_SKIP_PING === "1") {
  console.log("[postbuild] Skipping search-engine ping (POSTBUILD_SKIP_PING=1)");
} else {
  console.log("[postbuild] Pinging search engines...");
  await import("./ping-search-engines.mjs");
}
