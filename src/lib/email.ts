const FROM = "Viraleo <noreply@viraleo.pro>";

async function sendEmail(email: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email to", email);
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

export async function sendPaymentReceiptEmail(email: string, name: string, tier: string, amount: string): Promise<boolean> {
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

export async function sendCommissionNotificationEmail(email: string, name: string, amount: string, referrerName: string): Promise<boolean> {
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

export async function sendPayoutNotificationEmail(email: string, name: string, amount: string): Promise<boolean> {
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
