import { scorePost } from "../src/lib/threads/scorer";

async function main() {
  const a = await scorePost("testuser", "We Need A Web designer Urgently for our company website", "web-design");
  const b = await scorePost("otheruser", "funny meme about cats", "other");
  console.log("web:", JSON.stringify(a));
  console.log("other:", JSON.stringify(b));
}
main();