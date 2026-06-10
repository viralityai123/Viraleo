"""Find flop videos for the top 500 channels."""
import json
import sys
import config
from flop_finder import find_flop_videos

with open("output/top_500_emails.json", encoding="utf-8") as f:
    channels = json.load(f)

print(f"Loading {len(channels)} channels...")

channels = find_flop_videos(config.YOUTUBE_API_KEY, channels)

with open("output/top_500_flops.json", "w", encoding="utf-8") as f:
    json.dump(channels, f, ensure_ascii=False, indent=2)

with_flop = sum(1 for c in channels if c.get("flop_video_title"))
print(f"\nFlop videos found: {with_flop} / {len(channels)}")
print("Saved: output/top_500_flops.json")
