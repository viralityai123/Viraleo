// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.
// Also fires a best-effort email to viraleo.support@gmail.com for unhandled server errors.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

// Debounce: don't flood email for rapid repeated errors
let lastEmailedAt = 0;
const EMAIL_DEBOUNCE_MS = 30_000;

async function notifyErrorByEmail(error: unknown) {
  // Only fire every 30 seconds max and only server-side
  if (typeof window !== "undefined") return; // client-side skip
  const now = Date.now();
  if (now - lastEmailedAt < EMAIL_DEBOUNCE_MS) return;
  lastEmailedAt = now;

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  const errorId = `srv-${Math.random().toString(36).slice(2, 9)}`;
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? "") : "";

  const html = `<div style="font-family:monospace;max-width:680px;padding:24px;background:#0a0a0e;color:#e2e8f0;border-radius:12px;">
    <h2 style="color:#ff3d3d;font-family:sans-serif;margin-top:0;">⚠️ Server-Side Unhandled Error</h2>
    <table style="width:100%;font-size:13px;">
      <tr><td style="padding:4px 10px;color:#9ca3af;width:120px;">Error ID</td><td style="padding:4px 10px;color:#f59e0b;font-weight:bold;">${errorId}</td></tr>
      <tr><td style="padding:4px 10px;color:#9ca3af;">Timestamp</td><td style="padding:4px 10px;">${timestamp}</td></tr>
    </table>
    <div style="margin-top:12px;"><div style="color:#9ca3af;font-size:12px;margin-bottom:6px;">ERROR MESSAGE</div>
    <pre style="background:#1e1e2e;padding:12px;border-radius:8px;color:#f87171;white-space:pre-wrap;font-size:13px;">${message}</pre></div>
    <div style="margin-top:12px;"><div style="color:#9ca3af;font-size:12px;margin-bottom:6px;">STACK TRACE</div>
    <pre style="background:#1e1e2e;padding:12px;border-radius:8px;color:#94a3b8;white-space:pre-wrap;font-size:11px;">${stack}</pre></div>
  </div>`;

  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Viraleo Server", email: "noreply@viraleo.pro" },
        to: [{ email: "viraleo.support@gmail.com" }],
        subject: `🚨 Viraleo Server Error [${errorId}] — ${timestamp}`,
        htmlContent: html,
      }),
    });
  } catch {
    // Silent — can't do much if email itself fails
  }
}

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
  notifyErrorByEmail(error).catch(() => {});
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
