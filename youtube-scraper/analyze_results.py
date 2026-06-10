import json

with open("output/curated_creators.json", encoding="utf-8") as f:
    data = json.load(f)

target_countries = ["US", "GB", "CA"]

targets = [
    c for c in data
    if 10000 <= c.get("subscribers", 0) <= 50000
    and c.get("country", "") in target_countries
]

print(f"Total curated: {len(data)}")
print(f"Meeting US/UK/CA + 10k-50k: {len(targets)}\n")
for c in sorted(targets, key=lambda x: x.get("subscribers", 0), reverse=True):
    email = c.get("email") or "N/A"
    flop = c.get("flop_views", 0)
    avg = c.get("avg_views", 0)
    print(f"{c['channel_name'][:28]:28} {c['subscribers']:>6,} {c.get('country',''):4} email={email:30} flop={flop:>6,} avg={avg:>6,}")

print()

out_of_range = [
    c for c in data
    if not (10000 <= c.get("subscribers", 0) <= 50000)
    or c.get("country", "") not in target_countries
]
print(f"Out of range ({len(out_of_range)}):")
for c in sorted(out_of_range, key=lambda x: x.get("subscribers", 0), reverse=True):
    subs = c.get("subscribers", 0)
    country = c.get("country") or "none"
    reason = []
    if not (10000 <= subs <= 50000):
        reason.append(f"subs={subs:,}")
    if country not in target_countries:
        reason.append(f"country={country}")
    print(f"  {c['channel_name'][:28]:28} ({', '.join(reason)})")
