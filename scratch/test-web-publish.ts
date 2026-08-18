import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    const txt = readFileSync(".env.local", "utf8");
    for (const line of txt.split("\n")) {
      const clean = line.replace(/\r$/, "");
      const m = clean.match(/^([^=]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnv();

const { getSession } = await import("../src/lib/threads/session");
const { listQueue, removeFromQueue, pushLead, appendTrackerRow, trackerRow, incrementReplies } =
  await import("../src/lib/threads/store");
const { publishReplyWeb, webPublishStatus } = await import("../src/lib/threads/webPublish");

const want = process.argv[2] || "natalie1326007";

const s = await getSession();
console.log("session:", s ? `uid=${s.userId} cookies=${s.cookies.length}b lsd=${s.lsd ? "yes" : "no"} dtsg=${s.fbDtsg ? "yes" : "no"} docId=${s.docId || "none"}` : "NONE");

const status = await webPublishStatus();
console.log("webPublish status:", JSON.stringify(status));

const leads = await listQueue();
const lead = leads.find((l) => l.username === want);
if (!lead) {
  console.log(`LEAD NOT FOUND for @${want}`);
  const hot = leads
    .filter((l) => l.intentScore >= 80 && ["web-design", "ui-ux", "landing-page"].includes(l.category))
    .slice(0, 8);
  for (const l of hot) console.log(`  @${l.username} score=${l.intentScore} cat=${l.category} id=${l.postId}`);
  process.exit(1);
}
console.log(`LEAD: @${lead.username} postId=${lead.postId} score=${lead.intentScore} cat=${lead.category}`);
console.log(`DRAFT: ${lead.replyDrafts[0]?.slice(0, 160)}`);

const result = await publishReplyWeb(lead.postId, lead.replyDrafts[0]);
console.log("PUBLISH RESULT:", JSON.stringify(result));

if (result.ok) {
  await removeFromQueue(lead);
  lead.status = "approved";
  lead.replyId = result.replyId || "";
  lead.repliedAt = Date.now();
  await pushLead(lead);
  await appendTrackerRow(trackerRow(lead, result.replyId || "", "web-test"));
  await incrementReplies();
  console.log(`REPLY SENT (web session): replyId=${result.replyId}`);
} else {
  console.log("FAILED:", result.error);
}
