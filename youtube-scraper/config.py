import os

# ─── YOUTUBE API ───
# Get from https://console.cloud.google.com/apis/credentials
# Enable "YouTube Data API v3" in your project
YOUTUBE_API_KEY = "AIzaSyA_j_e9AmTvmPTd-PlJqKUkQLeBkT6ySsQ"

# ─── NICHES WITH REGION-SPECIFIC KEYWORDS ───
# Mix of shorts and long-form keywords to find both types of creators
NICHES = {
    "troll_faces": [
        "troll face shorts",
        "trollface meme",
        "meme shorts compilation",
        "funny troll shorts",
        "meme compilation",
        "try not to laugh",
    ],
    "edits": [
        "anime edit shorts",
        "cinematic edit",
        "trending edits",
        "sigma edit shorts",
        "anime edit",
        "cinematic video",
    ],
    "ranking": [
        "ranking shorts",
        "top moments shorts",
        "comparison shorts",
        "ranking everything shorts",
        "top 10",
        "ranking video",
    ],
    "gaming": [
        "gaming shorts",
        "minecraft shorts",
        "valorant shorts",
        "fortnite shorts",
        "gaming video",
        "minecraft gameplay",
    ],
    "tech": [
        "tech shorts",
        "gadget review shorts",
        "tech tips shorts",
        "programming shorts",
        "tech review",
        "how to tech",
    ],
    "finance": [
        "finance shorts",
        "money tips shorts",
        "investing shorts",
        "crypto shorts",
        "personal finance",
        "investing for beginners",
    ],
    "fitness": [
        "fitness shorts",
        "gym shorts",
        "workout shorts",
        "bodybuilding shorts",
        "workout routine",
        "home workout",
    ],
    "cooking": [
        "cooking shorts",
        "recipe shorts",
        "food shorts",
        "meal prep shorts",
        "cooking recipe",
        "easy recipes",
    ],
    "vlog": [
        "daily vlog",
        "day in the life",
        "travel vlog",
        "lifestyle vlog",
    ],
    "education": [
        "educational video",
        "science explained",
        "interesting facts",
        "history documentary",
    ],
}

# ─── TARGETS ───
CHANNELS_PER_NICHE = 2000
MAX_VIDEOS_TO_CHECK = 20
PROCESS_FLOP_ONLY_WITH_EMAIL = True
MIN_SUBSCRIBERS = 10000
MAX_SUBSCRIBERS = 50000

# Country filter — only channels that EXPLICITLY set country to US/GB/CA
TARGET_COUNTRIES = ["US", "GB", "CA"]
STRICT_COUNTRY_FILTER = False  # False = keep channels with no country set (yt-dlp search already US-biased)

# ─── EMAIL (BREVO SMTP) ───
SMTP_SERVER = "smtp-relay.brevo.com"
SMTP_PORT = 587
SMTP_ACCOUNTS = [
    (os.environ.get("BREVO_SMTP_LOGIN", ""), os.environ.get("BREVO_SMTP_KEY", "")),
]
EMAIL_DAILY_LIMIT = 50
SENDER_EMAIL = "viraleo.support@gmail.com"  # From: header (must be verified in Brevo)
SENDER_NAME = "MabiX — Viraleo"
LANDING_URL = "https://viraleo.pro"

# ─── OUTPUT ───
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
