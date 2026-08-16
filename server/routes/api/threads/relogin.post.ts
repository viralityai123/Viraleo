import { defineEventHandler, createError } from "h3";
import { reloginThreadsSession, canAttemptRelogin } from "../../../../src/lib/threads/relogin";

const isAdminBypass =
  (process.env.THREADS_DEV_BYPASS === "1" || !process.env.GOOGLE_CLIENT_ID) &&
  process.env.VERCEL !== "1";

export default defineEventHandler(async (event) => {
  if (!isAdminBypass) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  const gate = await canAttemptRelogin();
  if (!gate.allowed) {
    throw createError({ statusCode: 429, statusMessage: gate.reason });
  }

  const result = await reloginThreadsSession();
  const status = result.ok ? 200 : result.needsManual ? 202 : 500;
  return new Response(
    JSON.stringify({
      ok: result.ok,
      needsManual: result.needsManual ?? false,
      reason: result.reason ?? "",
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
});