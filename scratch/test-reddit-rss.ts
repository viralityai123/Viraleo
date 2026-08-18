const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const res = await fetch("https://www.reddit.com/r/forhire/search.rss?q=website&restrict_sr=1&sort=new&limit=10", { headers: { "user-agent": ua } });
console.log("status:", res.status);
const xml = await res.text();
console.log("len:", xml.length);
console.log("head:", xml.slice(0, 400));
console.log("has <item>:", xml.includes("<item>"), "has <entry>:", xml.includes("<entry>"), "has error:", xml.includes("<error>") || xml.includes("Blocked") || xml.includes("denied"));
console.log("tail:", xml.slice(-300));