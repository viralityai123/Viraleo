import { scorePost } from "../src/lib/threads/scorer";

(async () => {
  const hot = await scorePost(
    "client_tom",
    "[Hiring] Looking for a designer to build my e-commerce store, need it live this week",
    "web-design",
  );
  console.log(JSON.stringify(hot, null, 1));
})();
