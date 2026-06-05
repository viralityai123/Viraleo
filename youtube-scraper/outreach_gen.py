import html

import config


def esc(text):
    return html.escape(str(text or ""), quote=True)


def generate_outreach_html(channel):
    name = esc(channel.get("channel_name", "Creator"))
    title = esc(channel.get("flop_video_title", "your Short"))
    views = channel.get("flop_views", 0)
    avg = channel.get("avg_views", 0)
    thumb = channel.get("flop_thumbnail_url", "")
    subs = channel.get("subscribers", 0)
    sender = getattr(config, "SENDER_NAME", "PreAnalyze Team")
    landing = getattr(config, "LANDING_URL", "#")

    gap_pct = round((1 - views / max(avg, 1)) * 100) if avg > views else 0

    thumb_section = ""
    if thumb:
        thumb_section = f"""
  <tr>
    <td style="padding:32px 32px 8px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align:center;">
            <span style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1px;">Flop Video</span>
          </td>
        </tr>
      </table>
      <div style="margin-top:12px;background:#f8f9fc;border-radius:14px;padding:18px;border:1px solid #eef0f5;">
        <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#1a1a2e;line-height:1.4;">{title}</h3>
        <div style="position:relative;display:inline-block;width:100%;">
          <img src="{thumb}" alt="Your video thumbnail"
               style="width:100%;max-width:100%;height:auto;border-radius:10px;display:block;border:3px solid #fff;box-shadow:0 4px 20px rgba(0,0,0,0.12);">
          <div style="position:absolute;top:10px;left:10px;background:rgba(255,70,70,0.92);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;">
            -{gap_pct}%
          </div>
        </div>
      </div>
    </td>
  </tr>"""

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
</style>
</head>
<body style="margin:0;padding:0;background-color:#0f0f11;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table align="center" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;margin:30px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.15);">

  <tr>
    <td style="padding:40px 32px 30px;text-align:center;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);">
      <div style="display:inline-block;background:rgba(255,255,255,0.08);border-radius:100px;padding:10px 22px;margin-bottom:16px;">
        <span style="color:#ff6b6b;font-size:14px;font-weight:600;letter-spacing:0.5px;">⚡ PERFORMANCE ALERT</span>
      </div>
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Hey {name}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:15px;">We spotted a video that seriously underperformed</p>
    </td>
  </tr>

  {thumb_section}

  <tr>
    <td style="padding:20px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" style="text-align:center;padding:12px 8px;background:#fee8ea;border-radius:10px;">
            <div style="font-size:18px;font-weight:800;color:#e94560;">{views:,}</div>
            <div style="font-size:11px;color:#e94560;font-weight:600;margin-top:2px;">VIEWS</div>
          </td>
          <td width="33%" style="text-align:center;padding:12px 8px;">
            <div style="font-size:18px;font-weight:800;color:#1a1a2e;">{avg:,}</div>
            <div style="font-size:11px;color:#888;font-weight:600;margin-top:2px;">AVERAGE</div>
          </td>
          <td width="33%" style="text-align:center;padding:12px 8px;background:#e8f4ee;border-radius:10px;">
            <div style="font-size:18px;font-weight:800;color:#2d8f5c;">{subs:,}</div>
            <div style="font-size:11px;color:#2d8f5c;font-weight:600;margin-top:2px;">SUBS</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:8px 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="height:6px;background:#eef0f5;border-radius:3px;">
            <div style="width:{min(views/max(avg,1)*100,100):.1f}%;height:6px;background:linear-gradient(90deg,#e94560,#ff6b6b);border-radius:3px;"></div>
          </td>
        </tr>
        <tr>
          <td style="text-align:right;font-size:11px;color:#999;padding-top:4px;">
            {gap_pct}% below your average
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:0 32px 8px;text-align:center;">
      <div style="border-top:1px solid #eef0f5;padding-top:24px;">
        <span style="display:inline-block;background:#1a1a2e;color:#fff;font-size:12px;font-weight:700;padding:6px 16px;border-radius:20px;letter-spacing:0.5px;">PREANALYZE INSIGHT</span>
      </div>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 32px;">
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#1a1a2e;letter-spacing:-0.3px;">We know why this flopped.</h2>
      <p style="font-size:15px;line-height:1.7;color:#555;margin:0 0 16px;">
        You spent time on this video, hit upload, and the algorithm barely showed it. Our <strong style="color:#1a1a2e;">PreAnalyze</strong> engine would have caught the issue <strong>before</strong> you published.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a2e,#24243e);border-radius:12px;padding:20px;">
        <tr>
          <td style="padding:6px 0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td width="28" style="vertical-align:top;padding-top:2px;"><span style="color:#4ade80;font-size:16px;">✓</span></td>
                <td style="color:rgba(255,255,255,0.9);font-size:14px;line-height:1.5;"><strong style="color:#fff;">Pre-upload analysis</strong><br><span style="color:rgba(255,255,255,0.5);font-size:13px;">Know if your video will flop or pop before you post</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td width="28" style="vertical-align:top;padding-top:2px;"><span style="color:#4ade80;font-size:16px;">✓</span></td>
                <td style="color:rgba(255,255,255,0.9);font-size:14px;line-height:1.5;"><strong style="color:#fff;">CTR &amp; retention score</strong><br><span style="color:rgba(255,255,255,0.5);font-size:13px;">See exactly what's wrong before the algorithm decides</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td width="28" style="vertical-align:top;padding-top:2px;"><span style="color:#4ade80;font-size:16px;">✓</span></td>
                <td style="color:rgba(255,255,255,0.9);font-size:14px;line-height:1.5;"><strong style="color:#fff;">Actionable fixes</strong><br><span style="color:rgba(255,255,255,0.5);font-size:13px;">Specific changes you can make to save your video</span></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:24px 32px 32px;text-align:center;">
      <a href="{landing}"
         style="background:linear-gradient(135deg,#e94560,#ff6b6b);color:#ffffff;padding:16px 40px;text-decoration:none;border-radius:50px;font-size:16px;font-weight:700;display:inline-block;box-shadow:0 6px 24px rgba(233,69,96,0.35);letter-spacing:0.3px;">
        Try PreAnalyze Free →
      </a>
      <p style="margin:14px 0 0;font-size:13px;color:#aaa;">No credit card. No strings attached.</p>
    </td>
  </tr>

  <tr>
    <td style="padding:24px 32px;text-align:center;background:#f8f9fc;border-top:1px solid #eef0f5;">
      <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
        Sent by <strong style="color:#555;">{sender}</strong><br>
        <span style="font-size:12px;color:#aaa;">Helping Shorts creators stop guessing their performance</span>
      </p>
    </td>
  </tr>

</table>
</body>
</html>"""
    return html


def generate_outreach_text(channel):
    name = channel.get("channel_name", "Creator")
    title = channel.get("flop_video_title", "your Short")
    views = channel.get("flop_views", 0)
    avg = channel.get("avg_views", 0)
    thumb = channel.get("flop_thumbnail_url", "")
    landing = getattr(config, "LANDING_URL", "#")

    text = f"""Hey {name},

We saw your Short "{title}" and it only got {views:,} views (your avg: {avg:,}).

We know why it flopped — our PreAnalyze tool would have caught it before you uploaded.

Thumbnail: {thumb}

Try PreAnalyze free: {landing}

—
PreAnalyze Team"""
    return text
