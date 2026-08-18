import { searchRedditSub } from "../src/lib/threads/fetcher-reddit";

async function main() {
  const subs = ["forhire", "designjobs", "web_design", "freelance", "forhire"];
  for (const sub of subs) {
    const { posts, blocked } = await searchRedditSub(sub, "", 100);
    console.log(new Date().toISOString().slice(11, 19), sub, "posts=", posts.length, "blocked=", blocked);
    if (posts.length > 0) console.log("  sample:", posts[0].username, ":", (posts[0].text || "").slice(0, 80));
    await new Promise((r) => setTimeout(r, 60_000));
  }
}
main();