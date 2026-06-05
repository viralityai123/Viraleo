import os
import json
import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import config
from outreach_gen import generate_outreach_html, generate_outreach_text

SENT_LOG_PATH = os.path.join(config.OUTPUT_DIR, "sent_emails.json")


def load_sent_log():
    if not os.path.exists(SENT_LOG_PATH):
        return set()
    try:
        with open(SENT_LOG_PATH, "r") as f:
            return set(json.load(f))
    except (json.JSONDecodeError, OSError):
        return set()


def append_sent_log(email):
    sent = load_sent_log()
    sent.add(email)
    with open(SENT_LOG_PATH, "w") as f:
        json.dump(sorted(sent), f, indent=2)


def send_emails(channels_data, dry_run=False):
    already_sent = load_sent_log()
    if already_sent:
        print(f"  ({len(already_sent)} already sent — skipped)")

    valid = [
        c for c in channels_data
        if c.get("email")
        and c.get("flop_video_title")
        and c.get("flop_views") is not None
        and c["email"] not in already_sent
    ]

    total_ready = len(valid) + len(already_sent)
    print(f"  Total with email+flop: {total_ready}")
    print(f"  Remaining to send:     {len(valid)}")

    if not valid:
        print("  Nothing to send.")
        return

    if config.EMAIL_DAILY_LIMIT <= 0:
        print("  EMAIL_DAILY_LIMIT is 0 or negative. Set it to a positive number in config.py.")
        return

    if dry_run:
        print(f"\n[DRY RUN] Would send to {len(valid)} channels:")
        for c in valid[:10]:
            print(f"  → {c['channel_name']} <{c['email']}> — flop: {c['flop_video_title'][:50]}...")
        if len(valid) > 10:
            print(f"  ... and {len(valid) - 10} more")
        return

    print(f"\nSending emails to {len(valid)} channels (limit: {config.EMAIL_DAILY_LIMIT}/day)...")

    server = None
    try:
        server = smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT)
        server.starttls()
        server.login(config.GMAIL_USER, config.GMAIL_APP_PASSWORD)
    except Exception as e:
        print(f"SMTP connection failed: {e}")
        return

    sent = 0
    failed = 0

    try:
        for i, channel in enumerate(valid):
            if sent >= config.EMAIL_DAILY_LIMIT:
                print(f"Reached daily limit ({config.EMAIL_DAILY_LIMIT}). Stopping.")
                break

            try:
                msg = MIMEMultipart("alternative")
                msg["From"] = f"{config.SENDER_NAME} <{config.GMAIL_USER}>"
                msg["To"] = channel["email"]
                msg["Subject"] = f"Your Short ({channel['flop_views']:,} views) — we know why it flopped"

                text_part = MIMEText(generate_outreach_text(channel), "plain")
                html_part = MIMEText(generate_outreach_html(channel), "html")

                msg.attach(text_part)
                msg.attach(html_part)

                server.send_message(msg)
                sent += 1
                append_sent_log(channel["email"])
                print(f"  [{sent}/{len(valid)}] ✓ {channel['channel_name']} <{channel['email']}>")

                delay = 86400 / config.EMAIL_DAILY_LIMIT
                time.sleep(delay)

            except Exception as e:
                failed += 1
                print(f"  [✗] {channel.get('email')}: {e}")
    finally:
        if server:
            server.quit()

    print(f"\nDone. Sent: {sent}, Failed: {failed}")
    print(f"  Total sent all-time: {len(load_sent_log())}")
