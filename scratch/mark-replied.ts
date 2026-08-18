import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  let s = "";
  for (const f of [".env.local", ".env"]) {
    if (existsSync(f)) s += readFileSync(f, "utf8") + "\n";
  }
  for (const line of s.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const { listQueue, removeFromQueue, pushLead, appendTrackerRow, trackerRow, incrementReplies } = await import(
  "../src/lib/threads/store"
);

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.log("usage: npx tsx scratch/mark-replied.ts <username> [username...]");
  process.exit(1);
}

const queue = await listQueue();
for (const want of targets) {
  const lead = queue.find((l) => l.username === want);
  if (!lead) {
    console.log(`@${want}: NOT in queue`);
    continue;
  }
  await removeFromQueue(lead);
  lead.status = "approved";
  lead.replyId = lead.replyId || "browser";
  lead.repliedAt = Date.now();
  await pushLead(lead);
  await appendTrackerRow(trackerRow(lead, lead.replyId || "browser", "web-browser"));
  await incrementReplies();
  console.log(`@${want}: marked replied (browser) — queue removed, tracker row added`);
}
const remaining = await listQueue();
console.log("queue remaining:", remaining.map((l) => `@${l.username}(${l.intentScore})`).join(", ") || "(empty)");