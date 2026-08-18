import fs from "fs";
const envText = fs.readFileSync(".env", "utf-8");
const match = envText.match(/GEMINI_KEYS=(.*)/);
const keysStr = match ? match[1] : "";
const keys = keysStr
  .split(",")
  .map((k) => k.trim().replace(/['"]/g, ""))
  .filter(Boolean);

console.log(`Found ${keys.length} keys`);

async function testKey(key, index) {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest"
  ];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello" }] }]
          })
        }
      );
      const status = res.status;
      const text = await res.text();
      console.log(`Key ${index} (${key.slice(0, 8)}...) | Model ${model}: Status ${status}`);
      if (status !== 200) {
        console.log(`  Response: ${text.slice(0, 150)}`);
      } else {
        console.log(`  SUCCESS!`);
      }
    } catch (err) {
      console.log(`Key ${index} | Model ${model}: Error ${err.message}`);
    }
  }
}

async function run() {
  for (let i = 0; i < keys.length; i++) {
    await testKey(keys[i], i);
  }
}

run();
