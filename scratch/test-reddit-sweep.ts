import { sweepReddit } from "../src/lib/threads/fetcher-reddit";

async function main() {
  const s = await sweepReddit(4200);
  console.log("searched", s.searched, "blocked", s.blocked, "candidates", s.posts.length);
  for (const p of s.posts.slice(0, 12)) console.log("-", p.username, ":", (p.text || "").slice(0, 100));
}
main();