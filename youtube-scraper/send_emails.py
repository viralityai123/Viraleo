"""
Email outreach to top 500 creators via Gmail SMTP.
Dark premium design matching viraleo.pro brand.
Reads top_500_final.csv, sends personalized emails.
~100/day limit, tracks progress, resume-safe.
"""

import csv, smtplib, json, os, time, random, itertools, sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, date
from collections import defaultdict
from config import SMTP_ACCOUNTS, SMTP_SERVER, SMTP_PORT, SENDER_NAME, LANDING_URL, EMAIL_DAILY_LIMIT, SENDER_EMAIL

CSV_PATH = "marketing_list.csv"
TRACKER_PATH = "output/sent_tracker.json"
LOG_PATH = "output/email_log.txt"
SLEEP_BETWEEN = 45

HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Viraleo - Partnership</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f6">
<tr><td align="center" style="padding:48px 16px 64px">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background-color:#0e0e10;border-radius:24px;border:1px solid rgba(255,255,255,0.07)">

    <tr>
      <td height="1" style="height:1px;background:linear-gradient(90deg,transparent,#22c55e,#6366f1,transparent);font-size:1px;line-height:1px">&nbsp;</td>
    </tr>

    <tr>
      <td style="padding:26px 32px 22px;border-bottom:1px solid rgba(255,255,255,0.06)">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="left" valign="middle" style="width:auto">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="width:30px;height:30px;border-radius:8px;text-align:center;vertical-align:middle">
                    <img src="https://viraleo.pro/vi-logo.png" alt="viraleo" width="30" height="30" style="display:block;border-radius:8px">
                  </td>
                  <td style="padding-left:8px">
                    <span style="font-size:16px;font-weight:700;letter-spacing:-0.03em;color:#ffffff">viraleo</span>
                  </td>
                </tr>
              </table>
            </td>
            <td align="right" valign="middle" style="width:auto">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:999px;padding:6px 14px;display:inline-table">
                <tr>
                  <td valign="middle" style="padding-right:4px;color:#f59e0b;font-size:11px;line-height:1">★</td>
                  <td valign="middle" style="padding-right:4px;color:#f59e0b;font-size:11px;line-height:1">★</td>
                  <td valign="middle" style="padding-right:4px;color:#f59e0b;font-size:11px;line-height:1">★</td>
                  <td valign="middle" style="padding-right:4px;color:#f59e0b;font-size:11px;line-height:1">★</td>
                  <td valign="middle" style="padding-right:7px;color:#f59e0b;font-size:11px;line-height:1">★</td>
                  <td valign="middle"><span style="font-size:11.5px;font-weight:500;color:#bbb;white-space:nowrap">Beta <strong style="color:#eee;font-weight:600">Testing</strong> Phase</span></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:26px 32px;background-color:#0e0e10">

        <p style="font-size:16px;color:#fff;margin:0 0 18px 0">Hey {first_name},</p>

        <p style="font-size:14.5px;line-height:1.7;color:#bbb;margin:0 0 16px 0">
          I've built a creator analytics platform called <strong style="color:#fff;font-weight:600">Viraleo</strong>.
        </p>

        <p style="font-size:14.5px;line-height:1.7;color:#bbb;margin:0 0 16px 0">
          It analyzes videos before upload and helps creators identify issues with hooks, retention, thumbnails, and content positioning before they publish.
        </p>

        <p style="font-size:14.5px;line-height:1.7;color:#bbb;margin:0 0 16px 0">
          I'm reaching out because I think your audience could genuinely benefit from it, and I'd like to explore a <strong style="color:#fff;font-weight:600">partnership</strong>.
        </p>

        <p style="font-size:14.5px;line-height:1.7;color:#bbb;margin:0 0 16px 0">
          Instead of a traditional sponsorship, I'd be happy to structure it as a <strong style="color:#fff;font-weight:600">revenue share/affiliate</strong> arrangement where you earn a percentage of every customer you bring in.
        </p>

        <p style="font-size:14.5px;line-height:1.7;color:#bbb;margin:0 0 16px 0">
          I've built the product and infrastructure already. What I'm missing is someone who understands distribution at scale.
        </p>

        <p style="font-size:14.5px;line-height:1.7;color:#bbb;margin:0 0 24px 0">
          If you're open to it, I'd love to show you a quick demo and see if there's a fit.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:22px">
          <tr>
            <td style="border-radius:14px;background:linear-gradient(135deg,#22c55e,#16a34a);padding:15px 24px;text-align:center">
              <a href="{landing_url}" style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:-0.02em;text-decoration:none;display:inline-block">
                Check out Viraleo
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="display:inline-block;vertical-align:middle;margin-left:6px">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size:14.5px;line-height:1.7;color:#bbb;margin:0">
          Thanks,<br>
          <span style="color:#fff;font-weight:600">MabiX</span>
        </p>

      </td>
    </tr>

    <tr>
      <td style="padding:18px 32px 24px;border-top:1px solid rgba(255,255,255,0.05)">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="left" valign="middle">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="width:36px;height:36px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#fff">M</td>
                  <td style="padding-left:10px">
                    <p style="font-size:13px;font-weight:600;color:#eee;margin:0">MabiX</p>
                    <p style="font-size:12px;color:#888;margin:0">Founder &middot; <a href="https://viraleo.pro" style="color:#999;text-decoration:none">viraleo.pro</a></p>
                  </td>
                </tr>
              </table>
            </td>
            <td align="right" valign="middle">
              <a href="{unsubscribe_url}" style="font-size:11px;color:#333;text-decoration:underline">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>

</td></tr>
</table>
</body>
</html>
"""
TEXT_TEMPLATE = """\
Hey {first_name},

I've built a creator analytics platform called Viraleo.

It analyzes videos before upload and helps creators identify issues with hooks, retention, thumbnails, and content positioning before they publish.

I'm reaching out because I think your audience could genuinely benefit from it, and I'd like to explore a partnership.

Instead of a traditional sponsorship, I'd be happy to structure it as a revenue share/affiliate arrangement where you earn a percentage of every customer you bring in.

I've built the product and infrastructure already. What I'm missing is someone who understands distribution at scale.

If you're open to it, I'd love to show you a quick demo and see if there's a fit.

→ Check out Viraleo: {landing_url}

Thanks,
MabiX
Founder, viraleo.pro
Unsubscribe: {unsubscribe_url}
"""

def compute_niche_benchmarks(rows):
    niches = defaultdict(lambda: {"gap_pcts": [], "flop_ratios": [], "engagement_rates": [], "sub_pens": []})

    for r in rows:
        niche = r.get("niche", "").strip()
        if not niche:
            continue
        avg_v = int(float(r.get("avg_views", 0) or 0))
        flop_v = int(float(r.get("flop_views", 0) or 0))
        flop_l = int(float(r.get("flop_likes", 0) or 0))
        subs = int(float(r.get("subscribers", 0) or 0))

        if avg_v > 0:
            gap = round((avg_v - flop_v) / avg_v * 100)
            niches[niche]["gap_pcts"].append(gap)
            niches[niche]["flop_ratios"].append(round(flop_v / avg_v, 3))

        if subs > 0 and flop_v > 0:
            niches[niche]["sub_pens"].append(round(flop_v / subs, 3))

        if flop_v > 0 and flop_l > 0:
            niches[niche]["engagement_rates"].append(round(flop_l / flop_v * 100, 1))

    benchmarks = {}
    for niche, d in niches.items():
        gp = d["gap_pcts"] or [50]
        fr = d["flop_ratios"] or [0.3]
        er = d["engagement_rates"] or [5.0]
        sp = d["sub_pens"] or [0.5]
        benchmarks[niche] = {
            "avg_gap": round(sum(gp) / len(gp), 1),
            "avg_flop_ratio": round(sum(fr) / len(fr), 3),
            "avg_engagement": round(sum(er) / len(er), 1),
            "avg_sub_pen": round(sum(sp) / len(sp), 3),
        }
    return benchmarks


def load_sent():
    if os.path.exists(TRACKER_PATH):
        with open(TRACKER_PATH) as f:
            return set(json.load(f))
    return set()


def save_sent(sent):
    with open(TRACKER_PATH, "w") as f:
        json.dump(sorted(sent), f)


def fill(template, **kwargs):
    for key, val in kwargs.items():
        template = template.replace(f"{{{key}}}", str(val))
    return template


def log(msg):
    line = f"[{datetime.now().isoformat()}] {msg}"
    try:
        print(line)
    except UnicodeEncodeError:
        print(line.encode(sys.stdout.encoding, errors="replace").decode(sys.stdout.encoding))
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def extract_first_name(channel_name):
    return channel_name.strip().split()[0] if channel_name.strip() else "Creator"


def generate_insights(row, benchmarks):
    channel = row.get("channel_name", "").strip()
    niche = row.get("niche", "").strip()
    subs = int(float(row.get("subscribers", 0) or 0))
    avg_views = int(float(row.get("avg_views", 0) or 0))
    flop_views = int(float(row.get("flop_views", 0) or 0))
    flop_likes = int(float(row.get("flop_likes", 0) or 0))
    total_views = int(float(row.get("total_views", 0) or 0))
    video_count = int(float(row.get("video_count", 0) or 0))

    if avg_views <= 0:
        return "", ""

    gap_pct = min(round((avg_views - flop_views) / avg_views * 100), 99)
    multiplier = round(avg_views / flop_views, 1) if flop_views > 0 else 0
    sub_pen = flop_views / subs if subs > 0 else None
    er = round(flop_likes / flop_views * 100, 1) if flop_views > 0 and flop_likes > 0 else None
    niche_label = niche.replace("_", " ").title() if niche else "Your niche"

    bench = benchmarks.get(niche, {
        "avg_gap": 50, "avg_flop_ratio": 0.3,
        "avg_engagement": 5.0, "avg_sub_pen": 0.5
    })

    insights = []
    icons = []
    colors = []

    views_k = int(flop_views / 1000) if flop_views >= 1000 else flop_views
    views_unit = "K" if flop_views >= 1000 else ""
    avg_k = int(avg_views / 1000) if avg_views >= 1000 else avg_views
    avg_unit = "K" if avg_views >= 1000 else ""

    insights.append(
        f"This video crashed with only <strong>{views_k}{views_unit}</strong> views while "
        f"you normally pull <strong>{avg_k}{avg_unit}</strong> — a <strong>{gap_pct}%</strong> "
        f"gap. Your average video destroys this one by <strong>{max(multiplier, 1):.1f}x</strong>. "
        f"That's a massive disconnect."
    )
    icons.append("🔥")
    colors.append("rgba(59,130,246,0.1)")

    gap_diff = round(gap_pct - bench["avg_gap"], 1)
    direction = "worse" if gap_diff > 0 else "better"
    gap_note = "Falling behind the pack." if gap_diff > 0 else "Actually doing better than most."
    insights.append(
        f"Compared to other <strong>{niche_label}</strong> creators, the typical gap is "
        f"<strong>{bench['avg_gap']:.1f}%</strong>. Your <strong>{gap_pct}%</strong> gap is "
        f"<strong>{abs(gap_diff):.1f} points {direction}</strong> than average. "
        f"{gap_note}"
    )
    icons.append("🎯")
    colors.append("rgba(34,197,94,0.1)")

    if sub_pen is not None and subs >= 100:
        sub_pct = round(sub_pen * 100, 1)
        bench_sub_pct = round(bench["avg_sub_pen"] * 100, 1)
        verb = "GHOSTED" if sub_pct < bench_sub_pct * 0.5 else "skipped"
        audience_note = "screaming for something different" if sub_pct < bench_sub_pct * 0.5 else "telling you something"
        insights.append(
            f"Your subscribers <strong>{verb}</strong> this video \u2014 only "
            f"<strong>{sub_pct}%</strong> of your <strong>{subs:,}</strong> subs showed up. "
            f"The niche average is <strong>{bench_sub_pct}%</strong>. Your audience is "
            f"<strong>{audience_note}</strong>."
        )
        icons.append("👤")
        colors.append("rgba(239,68,68,0.1)")

    if er is not None:
        bench_er = bench["avg_engagement"]
        er_diff = round(er - bench_er, 1)
        er_dir = "below" if er_diff < 0 else "above"
        er_note = "Your content isn't clicking with viewers." if er < bench_er else "Respectable, but could be higher."
        insights.append(
            f"Engagement is sitting at just <strong>{er:.1f}%</strong> "
            f"({flop_likes:,} likes / {flop_views:,} views) \u2014 that's "
            f"<strong>{abs(er_diff):.1f} points {er_dir}</strong> the niche benchmark "
            f"of <strong>{bench_er:.1f}%</strong>. "
            f"{er_note}"
        )
        icons.append("💬")
        colors.append("rgba(147,51,234,0.1)")

    if video_count > 0:
        channel_avg = int(total_views / video_count)
        stronger = "even worse" if channel_avg < avg_views else "just as bad"
        insights.append(
            f"Across <strong>{video_count}</strong> videos, your lifetime average is "
            f"<strong>{channel_avg:,}</strong> views. This flop at <strong>{flop_views:,}</strong> "
            f"is <strong>{gap_pct}% below</strong> your usual performance. One video like this "
            f"drags your entire channel stats down."
        )
        icons.append("📈")
        colors.append("rgba(234,179,8,0.1)")

    html_rows = ""
    for ins, icon, bg in zip(insights, icons, colors):
        html_rows += f'<div class="insight-row"><div class="insight-icon" style="background:{bg}">{icon}</div><p class="insight-copy">{ins}</p></div>\n'

    text_rows = [
        ins.replace("<strong>", "").replace("</strong>", "") for ins in insights
    ]

    return html_rows, "\n".join(text_rows)


def send_email(smtp, from_email, to_email, subject, html_body, text_body):
    msg = MIMEMultipart("alternative")
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    msg["Subject"] = subject
    msg["From"] = f"MabiX <{from_email}>"
    msg["To"] = to_email
    smtp.sendmail(from_email, [to_email], msg.as_string())


def main():
    if not SMTP_ACCOUNTS:
        print("ERROR: No SMTP accounts configured in config.py!")
        return
    for user, pw in SMTP_ACCOUNTS:
        if pw == "your_app_password_here":
            print(f"ERROR: Set App Password for {user} in config.py first!")
            print("1. Enable 2FA on that account")
            print("2. Go to https://myaccount.google.com/apppasswords")
            print("3. Generate an App Password and paste it into config.py")
            return

    with open(CSV_PATH, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    print(f"Loaded {len(rows)} creators")
    benchmarks = compute_niche_benchmarks(rows)
    print(f"Computed benchmarks for {len(benchmarks)} niches: {', '.join(sorted(benchmarks.keys()))}")

    print(f"All {len(rows)} from curated list")

    sent = load_sent()
    sent_emails = {e.rsplit("_", 1)[0] for e in sent}
    print(f"Already sent: {len(sent)} ({len(sent_emails)} unique)")

    remaining = [
        r for r in rows
        if r.get("email") and r["email"].strip() and r["email"].strip() not in sent_emails
    ]
    print(f"Remaining: {len(remaining)}")
    if not remaining:
        print("All done!")
        return

    today_sent = sum(1 for e in sent if e.endswith(f"_{date.today().isoformat()}"))
    daily_budget = max(0, EMAIL_DAILY_LIMIT - today_sent)
    batch = remaining[:daily_budget]
    print(f"Daily budget: {daily_budget}, sending: {len(batch)} across {len(SMTP_ACCOUNTS)} accounts")

    account_cycle = itertools.cycle(SMTP_ACCOUNTS)
    current_user = current_pw = None
    smtp = None

    try:
        for i, row in enumerate(batch, 1):
            # Rotate to next account
            next_user, next_pw = next(account_cycle)
            if next_user != current_user:
                if smtp:
                    smtp.quit()
                log(f"Connecting SMTP as {next_user}")
                smtp = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                smtp.ehlo()
                smtp.starttls()
                smtp.login(next_user, next_pw)
                log("SMTP connected")
                current_user, current_pw = next_user, next_pw

            email = row["email"].strip()
            channel = row.get("channel_name", "").strip()
            first_name = row.get("first_name", "").strip() or extract_first_name(channel)
            flop_title = row.get("flop_video_title", "").strip() or "a recent video"
            if len(flop_title) > 80:
                flop_title = flop_title[:77] + "..."

            flop_views = int(float(row.get("flop_views", 0) or 0))
            avg_views = int(float(row.get("avg_views", 0) or 0))
            thumbnail_url = row.get("flop_thumbnail_url", "").strip()
            niche = row.get("niche", "").strip()

            gap_pct = min(round((avg_views - flop_views) / avg_views * 100), 99) if avg_views > 0 else 50
            ctr_score = max(10, min(85, 68 - int(gap_pct * 0.4)))

            _, insights_text = generate_insights(row, benchmarks)

            html_full = fill(HTML_TEMPLATE,
                first_name=first_name,
                landing_url=LANDING_URL,
                unsubscribe_url=f"{LANDING_URL}/unsubscribe?email={email}",
            )
            text = fill(TEXT_TEMPLATE,
                first_name=first_name,
                landing_url=LANDING_URL,
                unsubscribe_url=f"{LANDING_URL}/unsubscribe?email={email}",
            )

            tracking_id = f"{email}_{date.today().isoformat()}"
            subject = f"Partnership opportunity with Viraleo"
            send_email(smtp, SENDER_EMAIL, email, subject, html_full, text)
            sent.add(tracking_id)
            save_sent(sent)
            log(f"[{i}/{len(batch)}] {email} ({channel}) via {current_user}")

            if i < len(batch):
                time.sleep(SLEEP_BETWEEN + random.randint(-10, 10))

    finally:
        if smtp:
            smtp.quit()

    log(f"Sent {len(batch)} today. {len(remaining) - len(batch)} remaining.")
    print(f"\nSent {len(batch)} emails. {len(remaining) - len(batch)} remaining.")

    remaining_count = len(remaining) - len(batch)
    if remaining_count <= 0:
        print("All done! 43 partnership emails sent.")
    else:
        print(f"{remaining_count} remaining. PC stays on.")


if __name__ == "__main__":
    main()
