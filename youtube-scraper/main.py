import os
import sys
import config
from channel_finder import search_channels, get_channel_details
from flop_finder import find_flop_videos
from email_sender import send_emails
from utils import export_to_csv, save_html_previews, save_checkpoint, load_checkpoint


def banner():
    print("=" * 55)
    print("  YouTube Creator Outreach Tool")
    print("  Finds 3000+ channels → extracts emails → finds flop videos → sends outreach")
    print("=" * 55)


def step(msg):
    print(f"\n▸ {msg}")


def main():
    banner()

    if config.YOUTUBE_API_KEY == "YOUR_API_KEY_HERE":
        print("\n[!] Edit config.py and set your YOUTUBE_API_KEY first!")
        sys.exit(1)

    os.makedirs(config.OUTPUT_DIR, exist_ok=True)

    # ── Resume from last checkpoint if available ──
    unique = load_checkpoint("step3_flops.json")
    if unique:
        print(f"\n[Resume] Found checkpoint with {len(unique)} channels (step 3 complete)")
        step_complete = 3
    else:
        unique = load_checkpoint("step2_details.json")
        if unique:
            print(f"\n[Resume] Found checkpoint with {len(unique)} channels (step 2 complete)")
            step_complete = 2
        else:
            unique = load_checkpoint("step1_channels.json")
            if unique:
                print(f"\n[Resume] Found checkpoint with {len(unique)} channels (step 1 complete)")
                step_complete = 1
            else:
                step_complete = 0

    # ── Step 1: Search channels ──
    if step_complete < 1:
        step("1. Searching channels across all niches")
        all_channels = []
        for niche, keywords in config.NICHES.items():
            print(f"\n  ── {niche} ──")
            channels = search_channels(
                config.YOUTUBE_API_KEY,
                keywords,
                config.CHANNELS_PER_NICHE,
                config.MAX_SEARCH_PAGES_PER_KEYWORD,
            )
            for c in channels:
                c["niche"] = niche
            all_channels.extend(channels)
            print(f"  Found {len(channels)} channels in '{niche}'")

        print(f"\n  Total before dedup: {len(all_channels)}")

        seen = set()
        unique = []
        for c in all_channels:
            if c["channel_id"] not in seen:
                seen.add(c["channel_id"])
                unique.append(c)

        print(f"  Total unique channels: {len(unique)}")
        if not unique:
            print("\n[!] No channels found. Check your API key and keywords.")
            sys.exit(1)
        save_checkpoint(unique, "step1_channels.json")
        step_complete = 1

    # ── Step 2: Get channel details ──
    if step_complete < 2:
        step("2. Getting channel details (description, email, subscribers)")
        unique = get_channel_details(config.YOUTUBE_API_KEY, unique)
        with_email = sum(1 for c in unique if c.get("email"))
        print(f"  Emails found: {with_email} / {len(unique)}")
        save_checkpoint(unique, "step2_details.json")
        step_complete = 2

    # ── Step 3: Find flop videos ──
    if step_complete < 3:
        step("3. Finding flop videos")
        unique = find_flop_videos(config.YOUTUBE_API_KEY, unique)
        with_flop = sum(1 for c in unique if c.get("flop_video_title"))
        print(f"  Flop videos found: {with_flop} / {len(unique)}")
        save_checkpoint(unique, "step3_flops.json")
        step_complete = 3

    # ── Step 4: Export ──
    step("4. Exporting CSV")
    export_to_csv(unique)

    step("5. Saving HTML previews")
    save_html_previews(unique)

    with_email = sum(1 for c in unique if c.get("email"))
    with_flop = sum(1 for c in unique if c.get("flop_video_title"))
    ready = [c for c in unique if c.get("email") and c.get("flop_video_title")]

    print(f"\n{'=' * 55}")
    print(f"  SUMMARY")
    print(f"  Total channels collected:     {len(unique)}")
    print(f"  Channels with email:          {with_email}")
    print(f"  Channels with flop video:     {with_flop}")
    daily_limit = max(config.EMAIL_DAILY_LIMIT, 1)
    print(f"  Ready to send today:          {min(len(ready), daily_limit)}")
    print(f"  Days to send all:             {max(1, -(-len(ready) // daily_limit))}")
    print(f"{'=' * 55}")

    print(f"\n  Output files in: {config.OUTPUT_DIR}/")

    choice = input(f"\n  Send emails now? (y = send, d = dry-run, n = skip): ").strip().lower()
    if choice == "y":
        send_emails(unique, dry_run=False)
    elif choice == "d":
        send_emails(unique, dry_run=True)
    else:
        print("  Skipped. Run again later or use: python -c \"from email_sender import send_emails; from utils import load_checkpoint; send_emails(load_checkpoint('step3_flops.json'))\"")


if __name__ == "__main__":
    main()
