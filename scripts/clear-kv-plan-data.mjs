import { createClient } from "@vercel/kv";
import { readFileSync } from "fs";

function loadEnv(path) {
  try {
    const text = readFileSync(path, "utf-8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([^#\s=]+)\s*=\s*(.*?)\s*$/);
      if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  } catch {}
}
loadEnv(".env");
loadEnv(".env.local");
loadEnv(".env.production");

console.log("Env check:", {
  KV_REST_API_URL: process.env.KV_REST_API_URL?.slice(0, 20),
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL?.slice(0, 20),
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN?.slice(0, 10),
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN?.slice(0, 10),
});
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error("KV not configured");
  process.exit(1);
}

const kv = createClient({ url, token });
let deleted = 0;

async function delByPattern(pattern) {
  let cursor = 0;
  do {
    const [next, keys] = await kv.scan(cursor, { match: pattern, count: 100 });
    cursor = Number(next);
    if (keys.length > 0) {
      await kv.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== 0);
}

await delByPattern("userPlan:*");
await delByPattern("usage:*");
console.log(`Cleared ${deleted} keys (userPlan:* + usage:*)`);
process.exit(0);
