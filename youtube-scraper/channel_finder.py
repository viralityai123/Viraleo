import re
import time
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


def search_channels(api_key, niche_keywords, max_channels, max_pages):
    youtube = build("youtube", "v3", developerKey=api_key)
    channels = {}
    seen_ids = set()

    for keyword in niche_keywords:
        if len(channels) >= max_channels:
            break

        next_page_token = None
        pages = 0

        while pages < max_pages and len(channels) < max_channels:
            try:
                response = youtube.search().list(
                    q=keyword,
                    type="video",
                    part="snippet",
                    maxResults=50,
                    pageToken=next_page_token,
                    videoDuration="short",
                    order="relevance",
                ).execute()

                for item in response.get("items", []):
                    cid = item["snippet"]["channelId"]
                    if cid not in seen_ids:
                        seen_ids.add(cid)
                        channels[cid] = {
                            "channel_id": cid,
                            "channel_name": item["snippet"]["channelTitle"],
                            "found_via_keyword": keyword,
                        }

                next_page_token = response.get("nextPageToken")
                pages += 1

                if not next_page_token:
                    break

                time.sleep(0.2)

            except HttpError as e:
                print(f"  API search error for '{keyword}': {e}")
                break

    return list(channels.values())[:max_channels]


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
                c["uploads_playlist"] = (
                    item.get("contentDetails", {})
                    .get("relatedPlaylists", {})
                    .get("uploads", "")
                )

            time.sleep(0.2)

        except HttpError as e:
            print(f"  API error getting channel details: {e}")

    return channels_data
