/** Estimate creator RPM ($/1K views) from niche text + content format. */
export function estimateNicheRpm(
  niche: string,
  format: "long" | "short",
): { min: number; max: number; category: string } {
  const n = niche.toLowerCase();

  const tiers: { keywords: string[]; long: [number, number]; short: [number, number]; label: string }[] = [
    { keywords: ["finance", "invest", "stock", "trading", "money", "wealth"], long: [14, 32], short: [6, 14], label: "Finance" },
    { keywords: ["insurance", "mortgage", "loan", "credit", "tax"], long: [18, 38], short: [8, 16], label: "Finance services" },
    { keywords: ["crypto", "bitcoin", "blockchain", "nft", "web3"], long: [10, 24], short: [4, 12], label: "Crypto" },
    { keywords: ["legal", "lawyer", "attorney", "law"], long: [12, 28], short: [5, 12], label: "Legal" },
    { keywords: ["real estate", "realtor", "property", "housing"], long: [10, 22], short: [4, 10], label: "Real estate" },
    { keywords: ["saas", "b2b", "marketing", "business", "entrepreneur"], long: [8, 20], short: [3, 9], label: "Business" },
    { keywords: ["education", "course", "tutorial", "learn", "study"], long: [5, 14], short: [2, 7], label: "Education" },
    { keywords: ["tech", "software", "coding", "programming", "ai", "gadget"], long: [4, 12], short: [1.5, 6], label: "Tech" },
    { keywords: ["health", "fitness", "workout", "nutrition", "medical"], long: [4, 11], short: [1.5, 5], label: "Health" },
    { keywords: ["beauty", "fashion", "lifestyle", "vlog"], long: [2, 7], short: [0.8, 3.5], label: "Lifestyle" },
    { keywords: ["gaming", "gameplay", "minecraft", "fortnite", "roblox"], long: [1.5, 4.5], short: [0.5, 2.5], label: "Gaming" },
    { keywords: ["entertainment", "comedy", "reaction", "prank", "meme"], long: [1, 3.5], short: [0.4, 2], label: "Entertainment" },
  ];

  for (const tier of tiers) {
    if (tier.keywords.some((k) => n.includes(k))) {
      const [min, max] = format === "short" ? tier.short : tier.long;
      return { min, max, category: tier.label };
    }
  }

  const [min, max] = format === "short" ? [0.8, 3.5] : [2, 8];
  return { min, max, category: "General" };
}

export function normalizeRpmRange(
  niche: string,
  format: "long" | "short",
  llmMin?: number,
  llmMax?: number,
): { min: number; max: number; insight?: string } {
  const baseline = estimateNicheRpm(niche, format);
  let min = typeof llmMin === "number" && llmMin > 0 ? llmMin : baseline.min;
  let max = typeof llmMax === "number" && llmMax > 0 ? llmMax : baseline.max;

  // LLM sometimes returns CPM-scale numbers — convert if values look like CPM not RPM
  if (max > 15 && format === "long") {
    min = Math.round(min * 0.55 * 10) / 10;
    max = Math.round(max * 0.55 * 10) / 10;
  }

  min = Math.max(0.3, Math.min(min, max));
  max = Math.max(min, max);
  min = Math.round(min * 10) / 10;
  max = Math.round(max * 10) / 10;

  // Clamp to realistic band for detected category (±40%)
  const floor = Math.round(baseline.min * 0.6 * 10) / 10;
  const ceiling = Math.round(baseline.max * 1.4 * 10) / 10;
  min = Math.max(floor, Math.min(min, ceiling));
  max = Math.max(min, Math.min(max, ceiling));

  return { min, max };
}
