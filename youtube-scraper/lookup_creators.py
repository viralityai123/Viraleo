"""Look up curated creators from text file via YouTube API."""

import json
import os
import re
import sys
import time
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import config
from channel_finder import extract_email, safe_int
from flop_finder import get_channel_videos, get_video_stats_batch

CURATED_FILE = os.path.join(os.environ.get("USERPROFILE", "C:/Users/khath"), "OneDrive", "Desktop", "creators marketing.txt")
OUTPUT_DIR = config.OUTPUT_DIR
EXISTING_FILE = os.path.join(OUTPUT_DIR, "step3_flops.json")

EMAIL_REGEX = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"


def parse_curated_list():
    """Parse the creator text file into structured entries."""
    with open(CURATED_FILE, "r", encoding="utf-8") as f:
        text = f.read()

    entries = []
    blocks = re.split(r"\n\s*\n", text.strip())

    for block in blocks:
        lines = [l.strip() for l in block.strip().split("\n") if l.strip()]
        if not lines:
            continue

        name = ""
        handle = ""
        email = ""

        for line in lines:
            line_lower = line.lower()
            if line.startswith("@"):
                handle = line
            elif re.match(EMAIL_REGEX, line):
                email = line
            elif "email:" in line_lower:
                m = re.search(EMAIL_REGEX, line)
                if m:
                    email = m.group(0)
            elif not name:
                name = line

        if handle or name:
            entries.append({"name": name, "handle": handle, "email": email})

    return entries


def search_channel_by_handle(api_key, handle):
    """Search for a channel by @handle."""
    youtube = build("youtube", "v3", developerKey=api_key)
    try:
        response = youtube.search().list(
            q=handle,
            type="channel",
            part="snippet",
            maxResults=5,
        ).execute()

        for item in response.get("items", []):
            cid = item["snippet"]["channelId"]
            title = item["snippet"]["channelTitle"]
            return cid, title

    except HttpError as e:
        print(f"    API error searching '{handle}': {e}")
    return None, None


def get_channel_details(api_key, channel_id):
    """Get detailed info for a single channel."""
    youtube = build("youtube", "v3", developerKey=api_key)
    try:
        response = youtube.channels().list(
            part="snippet,statistics,contentDetails",
            id=channel_id,
        ).execute()

        for item in response.get("items", []):
            snippet = item["snippet"]
            stats = item.get("statistics", {})
            desc = snippet.get("description", "") or ""

            return {
                "channel_id": item["id"],
                "channel_name": snippet.get("title", ""),
                "subscribers": safe_int(stats.get("subscriberCount")),
                "total_views": safe_int(stats.get("viewCount")),
                "video_count": safe_int(stats.get("videoCount")),
                "description": desc,
                "email": extract_email(desc) or "",
                "country": snippet.get("country", "") or "",
                "uploads_playlist": item.get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads", ""),
            }
    except HttpError as e:
        print(f"    API error getting details: {e}")
    return None


def load_existing():
    """Load existing scraper data for cross-reference."""
    if not os.path.exists(EXISTING_FILE):
        return {}
    try:
        with open(EXISTING_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        by_name = {}
        by_id = {}
        for c in data:
            by_name[c.get("channel_name", "").lower().strip()] = c
            by_id[c.get("channel_id", "")] = c
        return by_name, by_id
    except (json.JSONDecodeError, OSError):
        return {}, {}


def save_checkpoint(data, path):
    path = os.path.join(OUTPUT_DIR, path)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Saved: {path}")


def main():
    api_key = config.YOUTUBE_API_KEY
    if api_key == "YOUR_API_KEY_HERE":
        print("[!] Set YOUTUBE_API_KEY in config.py first!")
        sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Parsing curated creator list...")
    entries = parse_curated_list()
    print(f"  Found {len(entries)} entries\n")

    existing_by_name, existing_by_id = load_existing()
    print(f"  Existing scraper data: {len(existing_by_name)} channels\n")

    results = []
    matched_existing = 0
    new_lookups = 0
    not_found_handles = []

    for idx, entry in enumerate(entries, 1):
        name = entry["name"]
        handle = entry["handle"]
        email = entry["email"]
        print(f"[{idx}/{len(entries)}] {name} ({handle})", end="")

        existing_name = existing_by_name.get(name.lower().strip())
        if existing_name:
            existing_name["email"] = existing_name["email"] or email
            existing_name["_source"] = "existing_scraper"
            existing_name["_curated_name"] = name
            existing_name["_curated_handle"] = handle
            results.append(existing_name)
            matched_existing += 1
            print(f" → match in scraper data ({existing_name['subscribers']} subs)")
            continue

        if not handle or not handle.startswith("@"):
            print(" — no @handle, skipped")
            not_found_handles.append(name)
            continue

        print(" — searching...", end="")
        time.sleep(0.3)

        cid, cname = search_channel_by_handle(api_key, handle)
        if not cid:
            print(" not found")
            not_found_handles.append(name)
            continue

        details = get_channel_details(api_key, cid)
        if not details:
            print(" details error")
            not_found_handles.append(name)
            continue

        details["_source"] = "new_lookup"
        details["_curated_name"] = name
        details["_curated_handle"] = handle
        if email:
            details["email"] = email

        results.append(details)
        new_lookups += 1
        print(f" [OK] {details['subscribers']} subs, {details['country'] or 'no country'}")

        time.sleep(0.3)

    # Find flop videos for new lookups
    if new_lookups > 0:
        print(f"\n{'='*55}")
        print("Finding flop videos for new lookups...")
        youtube = build("youtube", "v3", developerKey=api_key)
        flop_count = 0
        for i, ch in enumerate(results):
            if ch.get("_source") != "new_lookup":
                continue
            if not ch.get("uploads_playlist"):
                print(f"  [{i+1}/{new_lookups}] {ch['channel_name']} — no uploads playlist")
                continue

            print(f"  [{i+1}/{new_lookups}] {ch['channel_name']}", end="")
            videos = get_channel_videos(youtube, ch["uploads_playlist"], config.MAX_VIDEOS_TO_CHECK)
            if not videos:
                print(" — no videos")
                continue

            video_ids = [v["video_id"] for v in videos]
            stats = get_video_stats_batch(youtube, video_ids)

            subs = max(ch.get("subscribers", 1), 1)
            for v in videos:
                s = stats.get(v["video_id"], {})
                v["views"] = s.get("views", 0)
                v["ratio"] = v["views"] / subs

            videos.sort(key=lambda x: x["views"])
            flop = videos[0]
            ch["flop_video_title"] = flop["title"]
            ch["flop_video_id"] = flop["video_id"]
            ch["flop_views"] = max(flop["views"], 1)
            ch["flop_thumbnail_url"] = stats.get(flop["video_id"], {}).get("thumbnail_url", "")
            ch["flop_published_at"] = flop["published_at"]
            ch["flop_ratio"] = round(flop["ratio"], 4)

            other = [v["views"] for v in videos[1:] if v["views"] > 0]
            ch["avg_views"] = max(round(sum(other) / len(other)) if other else 0, 1)
            flop_count += 1
            print(f" — flop: {ch['flop_views']} views (avg: {ch['avg_views']})")

        print(f"  Flop videos found: {flop_count}/{new_lookups}")

    save_checkpoint(results, "curated_creators.json")

    # Summary
    print(f"\n{'='*55}")
    print("SUMMARY")
    print(f"  Total curated creators:    {len(entries)}")
    print(f"  Matched existing scraped:  {matched_existing}")
    print(f"  New lookups completed:     {new_lookups}")
    print(f"  Not found:                 {len(not_found_handles)}")
    if not_found_handles:
        print(f"  Unmatched names: {', '.join(not_found_handles[:10])}")
        if len(not_found_handles) > 10:
            print(f"    ... and {len(not_found_handles)-10} more")


if __name__ == "__main__":
    main()
