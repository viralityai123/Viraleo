import csv
import os
import json
import config


CSV_FIELDS = [
    "channel_name",
    "channel_id",
    "subscribers",
    "total_views",
    "video_count",
    "email",
    "niche",
    "flop_video_title",
    "flop_video_id",
    "flop_views",
    "flop_likes",
    "flop_thumbnail_url",
    "flop_published_at",
    "flop_ratio",
    "avg_views",
    "found_via_keyword",
]


def safe_int(val, default=0):
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def export_to_csv(channels_data, filename="channels_data.csv"):
    path = os.path.join(config.OUTPUT_DIR, filename)

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(channels_data)

    with_email = sum(1 for c in channels_data if c.get("email"))
    with_flop = sum(1 for c in channels_data if c.get("flop_video_title"))

    print(f"\nExported {len(channels_data)} channels to {path}")
    print(f"  Channels with email: {with_email}")
    print(f"  Channels with flop video: {with_flop}")
    print(f"  Ready to send: {min(with_email, with_flop)}")


def save_html_previews(channels_data):
    from outreach_gen import generate_outreach_html

    html_dir = os.path.join(config.OUTPUT_DIR, "emails_html")
    os.makedirs(html_dir, exist_ok=True)

    count = 0
    for idx, c in enumerate(channels_data):
        if c.get("email") and c.get("flop_video_title"):
            html = generate_outreach_html(c)
            safe = c["channel_name"].replace(" ", "_").replace("/", "_")[:40]
            safe = "".join(x for x in safe if x.isalnum() or x in ("_", "-"))
            if not safe:
                safe = f"channel_{idx}"
            path = os.path.join(html_dir, f"{safe}.html")
            with open(path, "w", encoding="utf-8") as f:
                f.write(html)
            count += 1

    print(f"Saved {count} HTML email previews to {html_dir}/")


def save_checkpoint(channels_data, path="checkpoint.json"):
    path = os.path.join(config.OUTPUT_DIR, path)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(channels_data, f, ensure_ascii=False, indent=2)
    print(f"Checkpoint saved: {path}")


def load_checkpoint(path="checkpoint.json"):
    path = os.path.join(config.OUTPUT_DIR, path)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        print(f"  [Warning] Corrupted checkpoint: {path}. Starting fresh.")
        return None
