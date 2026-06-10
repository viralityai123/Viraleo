import re
import subprocess
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import config
from utils import safe_int


EMAIL_REGEX = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"


def extract_email(text):
    if not text:
        return None
    matches = re.findall(EMAIL_REGEX, text)
    return matches[0].strip().lower() if matches else None


def _yt_search_keyword(keyword):
    """Run a single yt-dlp search for a keyword. Returns (keyword, results_dict)."""
    results = {}
    try:
        cmd = [
            "yt-dlp", "--no-warnings", "--flat-playlist",
            "--dump-json", "--ignore-errors",
            "--extractor-args", "youtube:skip=webpage",
            f"ytsearch500:{keyword}",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            try:
                data = json.loads(line)
                cid = data.get("channel_id")
                if cid:
                    results[cid] = {
                        "channel_id": cid,
                        "channel_name": data.get("channel", "") or data.get("uploader", ""),
                        "found_via_keyword": keyword,
                    }
            except json.JSONDecodeError:
                continue
    except subprocess.TimeoutExpired:
        pass
    except Exception:
        pass
    return keyword, results


def yt_search_channels(niche_keywords, max_channels):
    channels = {}
    seen_ids = set()

    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(_yt_search_keyword, kw): kw for kw in niche_keywords}

        for future in as_completed(futures):
            if len(channels) >= max_channels:
                break

            kw, kw_results = future.result()
            new_count = 0
            for cid, ch_data in kw_results.items():
                if cid not in seen_ids and len(channels) < max_channels:
                    seen_ids.add(cid)
                    channels[cid] = ch_data
                    new_count += 1

            print(f"    yt-dlp search: '{kw}' — {new_count} new channels")
            time.sleep(1.0)

    result = list(channels.values())[:max_channels]
    print(f"  Total from yt-dlp search: {len(result)} channels")
    return result


def search_channels(api_key, niche_keywords, max_channels, max_pages):
    return yt_search_channels(niche_keywords, max_channels)


def get_channel_details(api_key, channels_data):
    youtube = build("youtube", "v3", developerKey=api_key)
    channel_by_id = {c["channel_id"]: c for c in channels_data if c.get("channel_id")}

    for i in range(0, len(channels_data), 50):
        batch_ids = [c["channel_id"] for c in channels_data[i : i + 50]]

        try:
            response = youtube.channels().list(
                part="snippet,statistics,contentDetails",
                id=",".join(batch_ids),
            ).execute()

            for item in response.get("items", []):
                cid = item["id"]
                c = channel_by_id.get(cid)
                if not c:
                    continue

                snippet = item["snippet"]
                stats = item.get("statistics", {})
                description = snippet.get("description", "") or ""

                c["channel_name"] = snippet.get("title", c["channel_name"])
                c["subscribers"] = safe_int(stats.get("subscriberCount"))
                c["total_views"] = safe_int(stats.get("viewCount"))
                c["video_count"] = safe_int(stats.get("videoCount"))
                c["description"] = description
                c["email"] = extract_email(description) or ""
                c["country"] = snippet.get("country", "") or ""
                c["uploads_playlist"] = (
                    item.get("contentDetails", {})
                    .get("relatedPlaylists", {})
                    .get("uploads", "")
                )

            time.sleep(0.2)

        except HttpError as e:
            print(f"  API error getting channel details: {e}")

    return channels_data


def filter_channels(channels_data):
    min_subs = getattr(config, "MIN_SUBSCRIBERS", 0)
    max_subs = getattr(config, "MAX_SUBSCRIBERS", 999999999)
    target_countries = getattr(config, "TARGET_COUNTRIES", [])
    strict_country = getattr(config, "STRICT_COUNTRY_FILTER", False)
    before = len(channels_data)
    filtered = []
    for c in channels_data:
        subs = safe_int(c.get("subscribers"))
        country = (c.get("country") or "").upper().strip()
        if subs < min_subs or subs > max_subs:
            continue
        if target_countries:
            if not country and strict_country:
                continue
            if country and country not in target_countries:
                continue
        filtered.append(c)
    after = len(filtered)
    mode = "strict" if strict_country else "lax"
    print(f"  Filter ({mode}) {min_subs}-{max_subs} subs {target_countries}: {before} -> {after} channels")
    return filtered
