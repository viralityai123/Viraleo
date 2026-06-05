import https from "node:https";

const SITEMAP_URL = "https://viraleo.pro/sitemap.xml";

const urls = [
  `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
  `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
];

async function ping(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      console.log(`[ping] ${url} → ${res.statusCode}`);
      resolve(res.statusCode);
    }).on("error", (err) => {
      console.error(`[ping] ${url} → FAILED: ${err.message}`);
      resolve(null);
    });
  });
}

const results = await Promise.all(urls.map(ping));
const ok = results.every((r) => r === 200);
if (ok) {
  console.log("[ping] All search engines notified");
} else {
  console.log("[ping] Some pings failed (non-critical)");
}
