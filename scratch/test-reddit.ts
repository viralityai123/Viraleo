import { searchRedditSub, sweepReddit } from "../src/lib/threads/fetcher-reddit";

async function main() {
  const { posts, blocked } = await searchRedditSub("forhire", "website", 10);
  console.log("forhire 'website':", posts.length, "posts, blocked:", blocked);
  for (const p of posts.slice(0, 8)) {
    console.log(`- ${p.username}: ${(p.text || "").slice(0, 90)}`);
  }
  const sweep = await sweepReddit(1500);
  console.log("SWEEP: searched", sweep.searched, "blocked", sweep.blocked, "candidates", sweep.posts.length);
  for (const p of sweep.posts.slice(0, 10)) {
    console.log(`- [${p.flair || "no-flair"}] ${p.username}: ${(p.text || "").slice(0, 90)}`);
  }
}
main();