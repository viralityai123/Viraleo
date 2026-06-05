import os

# ─── YOUTUBE API ───
# Get from https://console.cloud.google.com/apis/credentials
# Enable "YouTube Data API v3" in your project
YOUTUBE_API_KEY = "YOUR_API_KEY_HERE"

# ─── NICHE CONFIG ───
# Each niche = list of search keywords. Add more keywords to find more channels.
NICHES = {
    "troll_faces": [
        "troll face shorts",
        "trollface meme",
        "meme shorts compilation",
        "funny troll shorts",
    ],
    "edits": [
        "anime edit shorts",
        "cinematic edit",
        "trending edits",
        "sigma edit shorts",
    ],
    "ranking": [
        "ranking shorts",
        "top moments shorts",
        "comparison shorts",
        "ranking everything shorts",
    ],
    "gaming": [
        "gaming shorts",
        "minecraft shorts",
        "valorant shorts",
        "fortnite shorts",
    ],
    "tech": [
        "tech shorts",
        "gadget review shorts",
        "tech tips shorts",
        "programming shorts",
    ],
    "finance": [
        "finance shorts",
        "money tips shorts",
        "investing shorts",
        "crypto shorts",
    ],
    "fitness": [
        "fitness shorts",
        "gym shorts",
        "workout shorts",
        "bodybuilding shorts",
    ],
    "cooking": [
        "cooking shorts",
        "recipe shorts",
        "food shorts",
        "meal prep shorts",
    ],
}

# ─── TARGETS ───
CHANNELS_PER_NICHE = 375
MAX_SEARCH_PAGES_PER_KEYWORD = 2      # 2 pages per keyword keeps us under 10k quota
MAX_VIDEOS_TO_CHECK = 30              # check last 30 videos per channel (saves quota)
PROCESS_FLOP_ONLY_WITH_EMAIL = True   # TRUE = only find flop videos for channels that have emails

# ─── EMAIL (GMAIL SMTP) ───
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
GMAIL_USER = "your_email@gmail.com"
GMAIL_APP_PASSWORD = "your_app_password"
EMAIL_DAILY_LIMIT = 500
SENDER_NAME = "PreAnalyze Team"
LANDING_URL = "https://your-preanalyze-tool.com"

# ─── OUTPUT ───
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
