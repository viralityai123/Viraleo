import { searchRedditSub } from "../src/lib/threads/fetcher-reddit";

async function main() {
  const combos: [string, string][] = [
    ["forhire", "website"],
    ["forhire", "ui/ux"],
    ["forhire", "design"],
    ["designjobs", "website"],
    ["web_design", "website"],
    ["freelance", "website"],
    ["forhire", "website"],
  ];
  for (const [sub, q] of combos) {
    const { posts, blocked } = await searchRedditSub(sub, q, 10);
    console.log(`${sub} '${q}': posts=${posts.length} blocked=${blocked}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}
main();