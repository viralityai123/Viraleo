import time
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import config
from utils import safe_int


def get_channel_videos(youtube, playlist_id, max_results):
    videos = []
    next_page_token = None

    while len(videos) < max_results:
        try:
            response = youtube.playlistItems().list(
                part="snippet",
                playlistId=playlist_id,
                maxResults=min(50, max_results - len(videos)),
                pageToken=next_page_token,
            ).execute()

            for item in response.get("items", []):
                videos.append({
                    "video_id": item["snippet"]["resourceId"]["videoId"],
                    "title": item["snippet"]["title"],
                    "published_at": item["snippet"]["publishedAt"],
                })

            next_page_token = response.get("nextPageToken")
            if not next_page_token:
                break

            time.sleep(0.1)

        except HttpError as e:
            print(f"    Playlist API error: {e}")
            break

    return videos


def get_video_stats_batch(youtube, video_ids):
    stats_map = {}

    for i in range(0, len(video_ids), 50):
        batch = video_ids[i : i + 50]
        try:
            response = youtube.videos().list(
                part="statistics,snippet",
                id=",".join(batch),
            ).execute()

            for item in response.get("items", []):
                vid = item["id"]
                s = item.get("statistics", {})
                thumbs = item.get("snippet", {}).get("thumbnails", {})

                thumbnail_url = ""
                for quality in ("maxres", "standard", "high", "medium", "default"):
                    if quality in thumbs:
                        thumbnail_url = thumbs[quality]["url"]
                        break

                stats_map[vid] = {
                    "views": safe_int(s.get("viewCount")),
                    "likes": safe_int(s.get("likeCount")),
                    "comments": safe_int(s.get("commentCount")),
                    "thumbnail_url": thumbnail_url,
                }

            time.sleep(0.1)

        except HttpError as e:
            print(f"    Video stats API error: {e}")

    return stats_map


def find_flop_videos(api_key, channels_data):
    youtube = build("youtube", "v3", developerKey=api_key)

    if config.PROCESS_FLOP_ONLY_WITH_EMAIL:
        target = [c for c in channels_data if c.get("email")]
        skipped = len(channels_data) - len(target)
    else:
        target = channels_data
        skipped = 0

    total = len(target)
    print(f"  Processing {total} channels for flop videos", end="")
    if skipped:
        print(f" ({skipped} skipped — no email found)", end="")
    print()

    for idx, channel in enumerate(target, 1):
        playlist_id = channel.get("uploads_playlist")
        if not playlist_id:
            continue

        print(f"  [{idx}/{total}] {channel['channel_name']}", end="")

        videos = get_channel_videos(youtube, playlist_id, config.MAX_VIDEOS_TO_CHECK)
        if not videos:
            print(" — no videos found")
            continue

        video_ids = [v["video_id"] for v in videos]
        stats = get_video_stats_batch(youtube, video_ids)

        subs = max(channel.get("subscribers", 1), 1)

        for v in videos:
            s = stats.get(v["video_id"], {})
            v["views"] = s.get("views", 0)
            v["likes"] = s.get("likes", 0)
            v["thumbnail_url"] = s.get("thumbnail_url", "")
            v["ratio"] = v["views"] / subs

        videos.sort(key=lambda x: x["views"])

        flop = videos[0]
        channel["flop_video_title"] = flop["title"]
        channel["flop_video_id"] = flop["video_id"]
        channel["flop_views"] = max(flop["views"], 1)
        channel["flop_likes"] = flop["likes"]
        channel["flop_thumbnail_url"] = flop["thumbnail_url"] or ""
        channel["flop_published_at"] = flop["published_at"]
        channel["flop_ratio"] = round(flop["ratio"], 4)

        other = [v["views"] for v in videos[1:] if v["views"] > 0]
        channel["avg_views"] = max(round(sum(other) / len(other)) if other else 0, 1)

        print(f" — flop: {channel['flop_views']} views (avg: {channel['avg_views']})")

    return channels_data
