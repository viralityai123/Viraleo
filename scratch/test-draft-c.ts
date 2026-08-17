import { scorePost } from "../src/lib/threads/scorer";

(async () => {
  const hot = await scorePost(
    "client_tom",
    "[Hiring] Looking for a designer to build my e-commerce store, budget $300, need it live this week",
    "web-design",
  );
  const weak = await scorePost(
    "random_guy",
    "just launched my portfolio, check it out!",
    "web-design",
  );
  console.log("HOT:", JSON.stringify(hot, null, 1));
  console.log("WEAK:", JSON.stringify(weak, null, 1));
})();
