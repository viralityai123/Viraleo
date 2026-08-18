const r = await fetch("https://www.threads.com/@myrasharma808/post/DcL1LRtEUB0", {
  headers: {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  },
});
const t = await r.text();
console.log("status", r.status, "len", t.length);
const i = t.indexOf("winning websites");
console.log("reply text found @", i);
if (i >= 0) console.log(t.slice(i - 400, i + 400).replace(/\s+/g, " "));