import fs from "fs";
import { generateLLMContent } from "../src/lib/llm.ts";

const envText = fs.readFileSync(".env", "utf-8");
const match = envText.match(/GEMINI_KEYS=(.*)/);
if (match) process.env.GEMINI_KEYS = match[1];

async function test() {
  try {
    const res = await generateLLMContent("Return JSON: {\"status\": \"ok\"}", [], "quality");
    console.log("generateLLMContent RESULT:", res);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

test();
