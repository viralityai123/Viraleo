import * as fs from "node:fs";
const raw = fs.readFileSync(".env.local", "utf8").replace(/\r/g, "");
for (const line of raw.split("\n")) {
  const i = line.indexOf("=");
  if (i > 0 && !process.env[line.slice(0, i)]) process.env[line.slice(0, i)] = line.slice(i + 1);
}

import { scorePost } from "../src/lib/threads/scorer";

async function main() {
  const web = await scorePost("client1", "Need a website for my coffee shop, something clean and modern", "web-design");
  const vid = await scorePost("client2", "Hiring a video editor for my YouTube channel, weekly long form videos", "video");
  console.log("WEB draftA:", web?.draftA);
  console.log("WEB draftB:", web?.draftB);
  console.log("VIDEO draftA:", vid?.draftA);
  console.log("VIDEO draftB:", vid?.draftB);
}
main();