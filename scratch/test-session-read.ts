const { getKv } = await import("../src/lib/kv");
const kv = getKv();
console.log("kv:", !!kv);
try {
  const raw = await kv.get("threads:cookies");
  console.log("raw:", raw ? JSON.stringify(raw).slice(0, 200) : "NULL");
} catch (e) {
  console.log("kv.get threw:", e instanceof Error ? e.message : String(e));
}
const { getSession } = await import("../src/lib/threads/session");
try {
  const s = await getSession();
  console.log("getSession:", s ? `OK id=${s.sessionId.slice(0, 18)}` : "NONE");
} catch (e) {
  console.log("getSession threw:", e instanceof Error ? e.message : String(e));
}