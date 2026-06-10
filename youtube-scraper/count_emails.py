import json

with open("output/step3_flops.json", encoding="utf-8") as f:
    scraped = json.load(f)
with open("output/curated_creators.json", encoding="utf-8") as f:
    curated = json.load(f)

scraped_with_email = [c for c in scraped if c.get("email")]
curated_with_email = [c for c in curated if c.get("email")]

all_emails = set()
for c in scraped_with_email:
    all_emails.add(c["email"])
for c in curated_with_email:
    all_emails.add(c["email"])

print(f"Scraped channels with email:   {len(scraped_with_email)}")
print(f"Curated creators with email:   {len(curated_with_email)}")
print(f"Unique emails total:           {len(all_emails)}")
print()

print("--- Curated with emails ---")
for c in sorted(curated_with_email, key=lambda x: x.get("subscribers", 0), reverse=True):
    name = c.get("channel_name") or c.get("_curated_name", "")
    subs = c.get("subscribers", 0)
    email = c.get("email", "")
    print(f"  {name[:28]:28} {subs:>7,} {email}")

print()
print("--- Scraped with emails ---")
for c in sorted(scraped_with_email, key=lambda x: x.get("subscribers", 0), reverse=True):
    name = c.get("channel_name", "")
    subs = c.get("subscribers", 0)
    email = c.get("email", "")
    print(f"  {name[:28]:28} {subs:>7,} {email}")
