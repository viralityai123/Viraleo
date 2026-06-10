import json

with open("output/all_with_emails.json", encoding="utf-8") as f:
    data = json.load(f)

# Also load curated creators
with open("output/curated_creators.json", encoding="utf-8") as f:
    curated = json.load(f)

# Priority scoring system
def score(ch):
    s = 0
    subs = ch.get("subscribers", 0) or 0
    country = (ch.get("country") or "").upper().strip()

    # Country priority
    if country in ("US",):
        s += 100
    elif country in ("GB", "CA"):
        s += 80
    elif country in ("AU", "NZ", "IE"):
        s += 50
    elif country in ("",):
        s += 10
    else:
        s += 0

    # Subscriber sweet spot
    if 10000 <= subs <= 50000:
        s += 50
    elif 50000 < subs <= 100000:
        s += 30
    elif 1000 <= subs < 10000:
        s += 20
    elif subs > 100000:
        s += 10
    else:
        s += 0

    # Has uploads playlist (can find flop videos)
    if ch.get("uploads_playlist"):
        s += 20

    return s


# Score and sort
for c in data:
    c["_score"] = score(c)

scored = sorted(data, key=lambda x: x["_score"], reverse=True)
top_500 = scored[:500]

# Merge in curated creators (add their flop data if not already present)
curated_emails = {c.get("email", "").lower() for c in top_500 if c.get("email")}
for c in curated:
    email = (c.get("email") or "").lower()
    if email and email not in curated_emails:
        if "flop_video_title" in c:
            top_500.append(c)
            curated_emails.add(email)

top_500 = top_500[:500]

print(f"Top 500 selected ({len(top_500)} total)")
print()

countries = {}
for c in top_500:
    cnt = c.get("country", "") or "none"
    countries[cnt] = countries.get(cnt, 0) + 1
print("Country breakdown:")
for cnt, n in sorted(countries.items(), key=lambda x: -x[1]):
    print(f"  {cnt:12} {n}")

print()
sub_ranges = {"0-1k": 0, "1k-10k": 0, "10k-50k": 0, "50k-100k": 0, "100k-1M": 0, "1M+": 0}
for c in top_500:
    s = c.get("subscribers", 0) or 0
    if s < 1000: sub_ranges["0-1k"] += 1
    elif s < 10000: sub_ranges["1k-10k"] += 1
    elif s < 50000: sub_ranges["10k-50k"] += 1
    elif s < 100000: sub_ranges["50k-100k"] += 1
    elif s < 1000000: sub_ranges["100k-1M"] += 1
    else: sub_ranges["1M+"] += 1
print("Subscriber ranges:")
for r, n in sub_ranges.items():
    print(f"  {r:12} {n}")

# Save
output_path = "output/top_500_emails.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(top_500, f, ensure_ascii=False, indent=2)
print(f"\nSaved: {output_path}")

# Also export CSV
import csv
csv_path = "output/top_500_emails.csv"
fields = ["channel_name", "subscribers", "country", "email", "niche", "total_views", "video_count", "flop_video_title", "flop_views", "flop_ratio", "avg_views"]
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    w.writerows(top_500)
print(f"Saved: {csv_path}")

print(f"\nTop 10:")
for c in top_500[:10]:
    subs = c.get("subscribers", 0)
    cnt = c.get("country", "") or "?"
    email = c.get("email", "")
    name = c.get("channel_name", "?")
    print(f"  {name[:30]:30} {subs:>7,} {cnt:4} {email}")
