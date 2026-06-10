import json

with open("output/all_with_emails.json", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total with emails: {len(data)}")
print(f"Sample keys: {list(data[0].keys()) if data else 'empty'}")
print()

countries = {}
for c in data:
    cnt = c.get("country", "") or "none"
    countries[cnt] = countries.get(cnt, 0) + 1
print("Top 15 countries:")
for cnt, n in sorted(countries.items(), key=lambda x: -x[1])[:15]:
    print(f"  {cnt:12} {n}")

print()
sub_ranges = {"0-1k": 0, "1k-10k": 0, "10k-50k": 0, "50k-100k": 0, "100k-1M": 0, "1M+": 0}
for c in data:
    s = c.get("subscribers", 0)
    if s < 1000: sub_ranges["0-1k"] += 1
    elif s < 10000: sub_ranges["1k-10k"] += 1
    elif s < 50000: sub_ranges["10k-50k"] += 1
    elif s < 100000: sub_ranges["50k-100k"] += 1
    elif s < 1000000: sub_ranges["100k-1M"] += 1
    else: sub_ranges["1M+"] += 1
print("Subscriber ranges:")
for r, n in sub_ranges.items():
    print(f"  {r:12} {n}")
