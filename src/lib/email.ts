const FROM = "Viraleo <noreply@viraleo.pro>";
const SUPPORT_EMAIL = "viraleo.support@gmail.com";

async function sendEmailBrevo(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("BREVO_API_KEY not set — skipping email to", to);
    return false;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Viraleo", email: "noreply@viraleo.pro" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("Brevo error:", res.status, body.slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Brevo exception:", e);
    return false;
  }
}

async function sendEmail(email: string, subject: string, html: string): Promise<boolean> {
  // Try Brevo first (configured in .env), fall back to Resend
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey) {
    return sendEmailBrevo(email, subject, html);
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "No email provider configured (BREVO_API_KEY or RESEND_API_KEY) — skipping email to",
      email,
    );
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: email, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("Resend error:", res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Resend exception:", e);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  return sendEmail(
    email,
    "Welcome to Viraleo!",
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;color:#1d1d1f;">Welcome to Viraleo, ${name}!</h1>
      <p style="color:#6e6e73;font-size:14px;">You now have access to AI-powered YouTube channel intelligence — thumbnail testing, niche ranking, shadowban detection, and pre-upload audit.</p>
      <a href="https://viraleo.pro/pre-analysis" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">Start your first analysis</a>
      <p style="color:#6e6e73;font-size:12px;margin-top:24px;">If you didn't sign up for Viraleo, ignore this email.</p>
    </div>`,
  );
}

export async function sendPaymentReceiptEmail(
  email: string,
  name: string,
  tier: string,
  amount: string,
): Promise<boolean> {
  return sendEmail(
    email,
    `Payment confirmed — ${tier} plan`,
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;color:#1d1d1f;">Payment confirmed, ${name}! 🎉</h1>
      <p style="color:#6e6e73;font-size:14px;">Your ${tier} plan is now active. You've been charged ${amount}.</p>
      <p style="color:#6e6e73;font-size:14px;">You now have access to all ${tier}-tier features. Happy analyzing!</p>
      <a href="https://viraleo.pro/pre-analysis" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">Go to dashboard</a>
    </div>`,
  );
}

export async function sendCommissionNotificationEmail(
  email: string,
  name: string,
  amount: string,
  referrerName: string,
): Promise<boolean> {
  return sendEmail(
    email,
    "You earned a commission! 🎉",
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;color:#1d1d1f;">Commission earned!</h1>
      <p style="color:#6e6e73;font-size:14px;">${referrerName} just purchased via your referral link. You earned <strong style="color:#22c55e;">${amount}</strong> in commission.</p>
      <a href="https://viraleo.pro/partner/dashboard" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">View your dashboard</a>
    </div>`,
  );
}

export async function sendPayoutNotificationEmail(
  email: string,
  name: string,
  amount: string,
): Promise<boolean> {
  return sendEmail(
    email,
    "Payout processed! 💰",
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;color:#1d1d1f;">Payout sent!</h1>
      <p style="color:#6e6e73;font-size:14px;">Your payout of <strong style="color:#22c55e;">${amount}</strong> has been processed and is on its way to your bank account.</p>
      <a href="https://viraleo.pro/partner/dashboard" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">Partner Dashboard</a>
    </div>`,
  );
}

export interface ThreadsLeadAlertItem {
  username: string;
  postUrl: string;
  category: string;
  intentScore: number;
  draft: string;
}

export async function sendThreadsLeadAlert(
  leads: ThreadsLeadAlertItem[],
  repliesToday: number,
): Promise<boolean> {
  const cards = leads
    .map(
      (
        l,
      ) => `<div style="background:#f4f4f5;border-radius:10px;padding:12px 14px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:14px;color:#1d1d1f;">@${l.username}</strong>
          <span style="background:#22c55e;color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:bold;">${l.intentScore} · ${l.category}</span>
        </div>
        <p style="color:#6e6e73;font-size:13px;margin:8px 0;">${l.draft}</p>
        <a href="${l.postUrl}" style="color:#22c55e;font-size:12px;">Open thread →</a>
      </div>`,
    )
    .join("");
  return sendEmail(
    process.env.ADMIN_EMAIL || SUPPORT_EMAIL,
    `🧵 ${leads.length} new Threads lead${leads.length > 1 ? "s" : ""} — reply fast`,
    `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <h1 style="font-size:20px;color:#1d1d1f;">New Threads leads — be first</h1>
      <p style="color:#6e6e73;font-size:13px;">Approve or skip at <a href="https://viraleo.pro/threads-queue" style="color:#22c55e;">viraleo.pro/threads-queue</a>. ${repliesToday} replies sent today.</p>
      ${cards}
    </div>`,
  );
}

export async function sendThreadsAlert(subject: string, body: string): Promise<boolean> {
  return sendEmail(
    process.env.ADMIN_EMAIL || SUPPORT_EMAIL,
    `🧵 ${subject}`,
    `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <h1 style="font-size:18px;color:#1d1d1f;">${subject}</h1>
      <p style="color:#6e6e73;font-size:14px;white-space:pre-wrap;">${body}</p>
    </div>`,
  );
}

export async function sendErrorReportEmail(
  errorId: string,
  errorMessage: string,
  stack: string,
  url?: string,
  userAgent?: string,
): Promise<boolean> {
  const timestamp = new Date().toISOString();
  return sendEmailBrevo(
    SUPPORT_EMAIL,
    `🚨 Viraleo Error [${errorId}] — ${timestamp}`,
    `<div style="font-family:monospace;max-width:680px;margin:0 auto;padding:24px;background:#0a0a0e;color:#e2e8f0;border-radius:12px;">
      <h2 style="color:#ff3d3d;font-family:sans-serif;margin-top:0;">⚠️ Runtime Error Detected</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:6px 12px;color:#9ca3af;width:130px;">Error ID</td><td style="padding:6px 12px;color:#f59e0b;font-weight:bold;">${errorId}</td></tr>
        <tr><td style="padding:6px 12px;color:#9ca3af;">Timestamp</td><td style="padding:6px 12px;">${timestamp}</td></tr>
        <tr><td style="padding:6px 12px;color:#9ca3af;">URL</td><td style="padding:6px 12px;">${url ?? "N/A"}</td></tr>
        <tr><td style="padding:6px 12px;color:#9ca3af;">User Agent</td><td style="padding:6px 12px;font-size:11px;">${userAgent ?? "N/A"}</td></tr>
      </table>
      <div style="margin-top:16px;">
        <div style="color:#9ca3af;font-size:12px;margin-bottom:6px;">ERROR MESSAGE</div>
        <pre style="background:#1e1e2e;padding:12px;border-radius:8px;color:#f87171;overflow:auto;font-size:13px;white-space:pre-wrap;">${errorMessage}</pre>
      </div>
      <div style="margin-top:16px;">
        <div style="color:#9ca3af;font-size:12px;margin-bottom:6px;">STACK TRACE</div>
        <pre style="background:#1e1e2e;padding:12px;border-radius:8px;color:#94a3b8;overflow:auto;font-size:11px;white-space:pre-wrap;">${stack}</pre>
      </div>
    </div>`,
  );
}
