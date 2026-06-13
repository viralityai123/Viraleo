"""Send one test email with the clickbait-style template."""
import csv, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import SMTP_SERVER, SMTP_PORT, LANDING_URL, SMTP_ACCOUNTS
from send_emails import HTML_TEMPLATE, TEXT_TEMPLATE, compute_niche_benchmarks, generate_insights, extract_first_name, fill

CSV_PATH = "output/top_500_final.csv"
TEST_TO = "viraleo.support@gmail.com"
GMAIL_USER, GMAIL_APP_PASSWORD = SMTP_ACCOUNTS[0]

with open(CSV_PATH, encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

benchmarks = compute_niche_benchmarks(rows)
row = rows[0]

channel = row["channel_name"].strip()
first_name = extract_first_name(channel)
flop_title = row.get("flop_video_title", "").strip() or "a recent video"
if len(flop_title) > 80:
    flop_title = flop_title[:77] + "..."

flop_views = int(float(row.get("flop_views", 0) or 0))
avg_views = int(float(row.get("avg_views", 0) or 0))
thumbnail_url = row.get("flop_thumbnail_url", "").strip()

gap_pct = min(round((avg_views - flop_views) / avg_views * 100), 99) if avg_views > 0 else 50
ctr_score = max(10, min(85, 68 - int(gap_pct * 0.4)))

_, insights_text = generate_insights(row, benchmarks)

html_full = fill(HTML_TEMPLATE,
    first_name=first_name,
    channel_name=channel,
    flop_title=flop_title,
    flop_views=f"{flop_views:,}",
    avg_views=f"{avg_views:,}",
    gap_pct=gap_pct,
    ctr_score=ctr_score,
    hook_time=12,
    hook_avg=6,
    thumb_score=41,
    thumb_median=68,
    retention_drop_pct=38,
    retention_drop_time=22,
    retention_avg_pct=72,
    landing_url=LANDING_URL,
    unsubscribe_url=f"{LANDING_URL}/unsubscribe?email={TEST_TO}",
)
text = fill(TEXT_TEMPLATE,
    first_name=first_name,
    channel_name=channel,
    flop_title=flop_title,
    flop_views=flop_views,
    avg_views=avg_views,
    gap_pct=gap_pct,
    insights_text=insights_text,
    landing_url=LANDING_URL,
    unsubscribe_url=f"{LANDING_URL}/unsubscribe?email={TEST_TO}",
)

subject = f"Your {channel} video is underperforming by {gap_pct}%"

print(f"Sending test to {TEST_TO}...")
print(f"Channel: {channel}")
print(f"Subject: {subject}")
print()

smtp = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
smtp.ehlo()
smtp.starttls()
smtp.login(GMAIL_USER, GMAIL_APP_PASSWORD)

msg = MIMEMultipart("alternative")
msg.attach(MIMEText(text, "plain"))
msg.attach(MIMEText(html_full, "html"))
msg["Subject"] = subject
msg["From"] = f"MabiX <{GMAIL_USER}>"
msg["To"] = TEST_TO

smtp.sendmail(GMAIL_USER, [TEST_TO], msg.as_string())
smtp.quit()

print("Sent! Check the inbox.")
