"""
Email outreach to top 500 creators via Gmail SMTP (free).
- Reads top_500_final.csv
- Sends personalized emails with flop video insight
- ~100/day limit to avoid Gmail spam flags
- Tracks progress so you can resume if interrupted

Usage:
  1. Enable 2FA on viraleo.support@gmail.com
  2. Create App Password at https://myaccount.google.com/apppasswords
  3. Put the password in config.py
  4. python send_emails.py
"""

import csv, smtplib, json, os, time, random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, date
from config import GMAIL_USER, GMAIL_APP_PASSWORD, SMTP_SERVER, SMTP_PORT, SENDER_NAME, LANDING_URL, EMAIL_DAILY_LIMIT

CSV_PATH = "output/top_500_final.csv"
TRACKER_PATH = "output/sent_tracker.json"
LOG_PATH = "output/email_log.txt"

SLEEP_BETWEEN = 45  # seconds between each email (Gmail rate limiting)

HTML_TEMPLATE = """\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:24px;margin-bottom:24px;border:1px solid #eaeaea">
  <tr>
    <td style="padding:32px 28px 28px 28px">
      <!-- Emoji header -->
      <div style="font-size:36px;margin-bottom:8px">🔥</div>

      <p style="font-size:17px;line-height:1.7;color:#1f2937;margin:0 0 16px 0">
        Hey <strong style="color:#111827">{first_name}</strong> —
      </p>

      <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 12px 0">
        I was digging into <strong style="color:#059669">{channel_name}</strong> and something jumped out.
      </p>

      <!-- Flop stat callout -->
      <table cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:10px;padding:0;margin:18px 0 18px 0;width:100%">
        <tr>
          <td style="padding:18px 20px">
            <p style="font-size:13px;color:#991b1b;margin:0 0 4px 0;font-weight:600;letter-spacing:0.3px">📉 BIG UNDERPERFORMER</p>
            <p style="font-size:15px;color:#1f2937;margin:0;line-height:1.6">
              Your video <strong>"{flop_title}"</strong> pulled only <strong style="color:#dc2626">{flop_views:,} views</strong> — while your channel averages <strong style="color:#059669">{avg_views:,}</strong>.
              That's a massive gap most creators never spot.
            </p>
          </td>
        </tr>
      </table>

      <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px 0">
        I built a tool called <strong style="color:#059669">Viraleo</strong> that scans any channel and tells you <em>exactly</em> why a video tanked — bad thumbnail? wrong time? weak SEO? It scores everything and gives you fixes before you upload.
      </p>

      <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 8px 0">
        I'll run a <strong>free full analysis</strong> on {channel_name} — just say the word.
      </p>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:0 28px 24px 28px">
      <table cellpadding="0" cellspacing="0" style="width:100%">
        <tr>
          <td align="center">
            <a href="{landing_url}" style="display:inline-block;padding:14px 36px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:-0.2px">Run My Free Analysis →</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:0 28px 28px 28px;border-top:1px solid #f0f0f0">
      <p style="font-size:13px;color:#9ca3af;margin:16px 0 0 0;line-height:1.5">
        Alex &middot; <a href="{landing_url}" style="color:#059669;text-decoration:none">viraleo.pro</a>
        <br>
        <span style="font-size:11px">If you don't want emails like this, <a href="{unsubscribe_url}" style="color:#9ca3af">unsubscribe here</a>.</span>
      </p>
    </td>
  </tr>
</table>
</body>
</html>
"""

TEXT_TEMPLATE = """\
🔥 Hey {first_name} —

I was digging into {channel_name} and something jumped out.

📉 BIG UNDERPERFORMER
Your video "{flop_title}" pulled only {flop_views:,} views — while your channel averages {avg_views:,}. That's a massive gap most creators never spot.

I built a tool called Viraleo that scans any channel and tells you EXACTLY why a video tanked — bad thumbnail? wrong time? weak SEO? It scores everything and gives you fixes before you upload.

I'll run a free full analysis on {channel_name} — just say the word.

→ Run My Free Analysis: {landing_url}

—
Alex
viraleo.pro
Unsubscribe: {unsubscribe_url}
"""


def load_sent():
    if os.path.exists(TRACKER_PATH):
        with open(TRACKER_PATH) as f:
            return set(json.load(f))
    return set()


def save_sent(sent):
    with open(TRACKER_PATH, "w") as f:
        json.dump(sorted(sent), f)


def log(msg):
    line = f"[{datetime.now().isoformat()}] {msg}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def extract_first_name(channel_name):
    name = channel_name.strip().split()[0] if channel_name.strip() else "Creator"
    return name


def send_email(smtp, to_email, subject, html_body, text_body):
    msg = MIMEMultipart("alternative")
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    msg["Subject"] = subject
    msg["From"] = f"{SENDER_NAME} <{GMAIL_USER}>"
    msg["To"] = to_email
    smtp.sendmail(GMAIL_USER, [to_email], msg.as_string())


def main():
    if GMAIL_APP_PASSWORD == "your_app_password_here":
        print("ERROR: Set GMAIL_APP_PASSWORD in config.py first!")
        print("1. Enable 2FA on viraleo.support@gmail.com")
        print("2. Go to https://myaccount.google.com/apppasswords")
        print("3. Generate an App Password and paste it into config.py")
        return

    # Load CSV
    with open(CSV_PATH, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"Loaded {len(rows)} creators from CSV")

    # Load sent tracker
    sent = load_sent()
    print(f"Already sent: {len(sent)}")

    # Filter unsent with valid emails
    remaining = [
        r for r in rows
        if r.get("email") and r["email"].strip()
        and r["email"].strip() not in sent
    ]
    print(f"Remaining to send: {len(remaining)}")

    if not remaining:
        print("All done!")
        return

    # Daily cap
    today_sent = sum(1 for e in sent if e.endswith(f"_{date.today().isoformat()}"))
    daily_budget = max(0, EMAIL_DAILY_LIMIT - today_sent)
    batch = remaining[:daily_budget]
    print(f"Today's budget: {daily_budget}, sending: {len(batch)}")

    # Connect SMTP
    log(f"Connecting to {SMTP_SERVER}:{SMTP_PORT} as {GMAIL_USER}")
    smtp = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    smtp.ehlo()
    smtp.starttls()
    smtp.login(GMAIL_USER, GMAIL_APP_PASSWORD)
    log("SMTP connected")

    try:
        for i, row in enumerate(batch, 1):
            email = row["email"].strip()
            channel = row.get("channel_name", "").strip()
            first_name = extract_first_name(channel)
            flop_title = row.get("flop_video_title", "").strip() or "one of your recent uploads"
            if len(flop_title) > 80:
                flop_title = flop_title[:77] + "..."

            try:
                flop_views = int(float(row.get("flop_views", 0)))
            except (ValueError, TypeError):
                flop_views = 0
            try:
                avg_views = int(float(row.get("avg_views", 0)))
            except (ValueError, TypeError):
                avg_views = 0
            flop_ratio = row.get("flop_ratio", "N/A")

            tracking_id = f"{email}_{date.today().isoformat()}"
            unsubscribe_url = f"{LANDING_URL}/unsubscribe?email={email}"

            html = HTML_TEMPLATE.format(
                first_name=first_name,
                channel_name=channel,
                flop_title=flop_title,
                flop_views=flop_views,
                avg_views=avg_views,
                flop_ratio=flop_ratio,
                sender_name=SENDER_NAME,
                landing_url=LANDING_URL,
                unsubscribe_url=unsubscribe_url,
            )
            text = TEXT_TEMPLATE.format(
                first_name=first_name,
                channel_name=channel,
                flop_title=flop_title,
                flop_views=flop_views,
                avg_views=avg_views,
                flop_ratio=flop_ratio,
                sender_name=SENDER_NAME,
                landing_url=LANDING_URL,
                unsubscribe_url=unsubscribe_url,
            )

            subject = f"🔥 {first_name}, your {channel} video tanked — here's why"
            send_email(smtp, email, subject, html, text)
            sent.add(tracking_id)
            save_sent(sent)
            log(f"[{i}/{len(batch)}] Sent to {email} ({channel})")

            # Sleep between sends (shorter for last, longer otherwise)
            if i < len(batch):
                sleep_time = SLEEP_BETWEEN + random.randint(-10, 10)
                time.sleep(sleep_time)

    finally:
        smtp.quit()

    log(f"Done! Sent {len(batch)} emails today. {len(remaining) - len(batch)} remaining.")
    print(f"\nSent {len(batch)} emails. Check {LOG_PATH} for details.")
    print(f"Remaining: {len(remaining) - len(batch)} (will resume tomorrow)")


if __name__ == "__main__":
    main()
