export interface MonetizationAnalysis {
  isMonetizable: "yes" | "limited" | "no";
  adSenseEligibility: "high" | "medium" | "low" | "atRisk";
  originalityRisk: "low" | "medium" | "high";
  advertiserFriendliness: "safe" | "caution" | "restricted";
  recommendedMonetization: string[];
  policyWarnings: string[];
  formatNotes: {
    shorts: string;
    longForm: string;
  };
  insight: string;
}

const TIERS: {
  keywords: string[];
  label: string;
  monetizable: "yes" | "limited" | "no";
  adSense: "high" | "medium" | "low" | "atRisk";
  adFriendly: "safe" | "caution" | "restricted";
  originalityRisk: "low" | "medium" | "high";
  channels: string[];
  warnings: string[];
}[] = [
  {
    keywords: ["finance", "invest", "stock", "trading", "money", "wealth", "personal finance", "budget"],
    label: "Finance",
    monetizable: "yes",
    adSense: "high",
    adFriendly: "safe",
    originalityRisk: "low",
    channels: ["AdSense", "Sponsorships", "Affiliate Marketing", "Digital Products"],
    warnings: ["Avoid giving specific financial advice without disclaimers"],
  },
  {
    keywords: ["insurance", "mortgage", "loan", "credit", "tax"],
    label: "Finance services",
    monetizable: "yes",
    adSense: "high",
    adFriendly: "caution",
    originalityRisk: "low",
    channels: ["AdSense", "Affiliate Marketing", "Consulting"],
    warnings: ["Strict compliance required — misleading claims = demonetization"],
  },
  {
    keywords: ["crypto", "bitcoin", "blockchain", "nft", "web3", "defi"],
    label: "Crypto",
    monetizable: "limited",
    adSense: "atRisk",
    adFriendly: "caution",
    originalityRisk: "low",
    channels: ["Affiliate Marketing", "Digital Products", "Memberships"],
    warnings: ["YouTube heavily restricts crypto content — limited ads", "Avoid promising returns or pump-and-dump language"],
  },
  {
    keywords: ["legal", "lawyer", "attorney", "law"],
    label: "Legal",
    monetizable: "yes",
    adSense: "high",
    adFriendly: "caution",
    originalityRisk: "low",
    channels: ["AdSense", "Consulting", "Digital Products"],
    warnings: ["Legal advice needs proper disclaimers", "Case-specific content may get limited ads"],
  },
  {
    keywords: ["real estate", "realtor", "property", "housing", "home buying"],
    label: "Real estate",
    monetizable: "yes",
    adSense: "high",
    adFriendly: "safe",
    originalityRisk: "low",
    channels: ["AdSense", "Sponsorships", "Affiliate Marketing"],
    warnings: [],
  },
  {
    keywords: ["saas", "b2b", "marketing", "business", "entrepreneur", "startup", "side hustle"],
    label: "Business",
    monetizable: "yes",
    adSense: "high",
    adFriendly: "safe",
    originalityRisk: "low",
    channels: ["AdSense", "Sponsorships", "Affiliate Marketing", "Digital Products"],
    warnings: [],
  },
  {
    keywords: ["education", "course", "tutorial", "learn", "study", "how to", "guide"],
    label: "Education",
    monetizable: "yes",
    adSense: "medium",
    adFriendly: "safe",
    originalityRisk: "low",
    channels: ["AdSense", "Sponsorships", "Digital Products", "Memberships"],
    warnings: [],
  },
  {
    keywords: ["tech", "software", "coding", "programming", "ai", "gadget", "review", "unboxing"],
    label: "Tech",
    monetizable: "yes",
    adSense: "high",
    adFriendly: "safe",
    originalityRisk: "low",
    channels: ["AdSense", "Sponsorships", "Affiliate Marketing"],
    warnings: ["AI content must be disclosed — non-disclosure risks demonetization"],
  },
  {
    keywords: ["health", "fitness", "workout", "nutrition", "medical", "supplement"],
    label: "Health",
    monetizable: "limited",
    adSense: "medium",
    adFriendly: "caution",
    originalityRisk: "low",
    channels: ["Sponsorships", "Affiliate Marketing", "Digital Products"],
    warnings: ["Medical claims without evidence = demonetization", "Supplement content needs disclaimers"],
  },
  {
    keywords: ["beauty", "makeup", "fashion", "skincare", "hair"],
    label: "Beauty",
    monetizable: "yes",
    adSense: "medium",
    adFriendly: "safe",
    originalityRisk: "low",
    channels: ["Sponsorships", "Affiliate Marketing", "AdSense"],
    warnings: [],
  },
  {
    keywords: ["food", "cooking", "recipe", "baking", "meal prep"],
    label: "Food",
    monetizable: "yes",
    adSense: "medium",
    adFriendly: "safe",
    originalityRisk: "low",
    channels: ["Sponsorships", "Affiliate Marketing", "AdSense"],
    warnings: [],
  },
  {
    keywords: ["diy", "home improvement", "craft", "woodworking", "renovation"],
    label: "DIY",
    monetizable: "yes",
    adSense: "medium",
    adFriendly: "safe",
    originalityRisk: "low",
    channels: ["AdSense", "Sponsorships", "Affiliate Marketing"],
    warnings: [],
  },
  {
    keywords: ["travel", "adventure", "vlog", "lifestyle"],
    label: "Lifestyle",
    monetizable: "limited",
    adSense: "low",
    adFriendly: "safe",
    originalityRisk: "medium",
    channels: ["Sponsorships", "Affiliate Marketing", "Memberships"],
    warnings: ["Vlogs need strong personal angle to avoid being generic"],
  },
  {
    keywords: ["gaming", "gameplay", "minecraft", "fortnite", "roblox", "valorant", "call of duty"],
    label: "Gaming",
    monetizable: "limited",
    adSense: "low",
    adFriendly: "safe",
    originalityRisk: "medium",
    channels: ["Sponsorships", "Memberships", "Merch"],
    warnings: ["Raw gameplay without commentary = reused content risk", "Violent games may get limited ads"],
  },
  {
    keywords: ["entertainment", "comedy", "reaction", "prank", "meme"],
    label: "Entertainment",
    monetizable: "limited",
    adSense: "low",
    adFriendly: "caution",
    originalityRisk: "high",
    channels: ["Sponsorships", "Memberships", "Merch"],
    warnings: ["Reaction content is high risk for reused content flags", "Pranks can violate harassment policies"],
  },
  {
    keywords: ["music", "song", "cover", "beat", "lofi"],
    label: "Music",
    monetizable: "limited",
    adSense: "low",
    adFriendly: "safe",
    originalityRisk: "medium",
    channels: ["Memberships", "Merch", "Streaming Revenue"],
    warnings: ["Copyright claims kill ad revenue on music content", "AI-generated music faces demonetization"],
  },
  {
    keywords: ["news", "politics", "current events", "commentary"],
    label: "News",
    monetizable: "limited",
    adSense: "low",
    adFriendly: "restricted",
    originalityRisk: "medium",
    channels: ["Memberships", "Sponsorships"],
    warnings: ["Advertisers avoid political content — limited or no ads", "Sensitive events may get full demonetization"],
  },
  {
    keywords: ["true crime", "mystery", "unsolved", "crime story"],
    label: "True Crime",
    monetizable: "limited",
    adSense: "low",
    adFriendly: "restricted",
    originalityRisk: "low",
    channels: ["Sponsorships", "Memberships", "Digital Products"],
    warnings: ["Sensitive events and graphic detail = limited/restricted ads", "YouTube relaxed policy in 2026 but still cautious"],
  },
  {
    keywords: ["asmr", "satisfying", "relaxing", "sleep"],
    label: "ASMR",
    monetizable: "limited",
    adSense: "low",
    adFriendly: "safe",
    originalityRisk: "high",
    channels: ["Memberships", "Sponsorships"],
    warnings: ["Low ad demand", "Easy to flag as repetitive/low-effort content"],
  },
  {
    keywords: ["compilation", "top 10", "best moments", "clips"],
    label: "Compilations",
    monetizable: "no",
    adSense: "atRisk",
    adFriendly: "safe",
    originalityRisk: "high",
    channels: [],
    warnings: ["Compilations without original commentary = reused content = demonetization"],
  },
];

export function estimateNicheMonetizable(
  niche: string,
  format: "long" | "short",
): MonetizationAnalysis {
  const n = niche.toLowerCase();
  const matched = TIERS.find((t) => t.keywords.some((k) => n.includes(k)));

  if (!matched) {
    return {
      isMonetizable: "limited",
      adSenseEligibility: "low",
      originalityRisk: "medium",
      advertiserFriendliness: "safe",
      recommendedMonetization: ["Sponsorships", "Affiliate Marketing", "Memberships"],
      policyWarnings: ["Unclear niche — monetization potential depends on execution"],
      formatNotes: {
        shorts: format === "short"
          ? "Shorts RPM is very low ($0.02–$0.08). Use Shorts for growth, not primary income."
          : "",
        longForm: format === "long"
          ? "Long-form allows mid-roll ads. Focus on retention to maximize ad revenue."
          : "",
      },
      insight: "This niche doesn't strongly match any monetization category. Success depends on how you execute — focus on originality and audience building before counting on ad revenue.",
    };
  }

  const formatNote = (m: typeof matched) => {
    if (format === "short") {
      if (m.monetizable === "no") return "Shorts monetization unlikely — focus on building audience first.";
      if (m.adSense === "high" || m.adSense === "medium") return "Works for Shorts but RPM is low ($0.02–$0.08 per 1K views). Use Shorts as a funnel to long-form.";
      return "Shorts RPM is very low. This niche works better for long-form ad revenue.";
    }
    if (m.adSense === "high") return "Strong long-form ad revenue potential. Enable mid-roll ads and target US/UK audiences.";
    if (m.adSense === "medium") return "Moderate long-form ad revenue. Diversify with sponsorships or affiliates.";
    if (m.adSense === "low") return "Ad revenue is limited in long-form. Focus on sponsorships and community funding.";
    return "Long-form monetization requires alternative revenue — ads alone won't sustain this niche.";
  };

  return {
    isMonetizable: matched.monetizable,
    adSenseEligibility: matched.adSense,
    originalityRisk: matched.originalityRisk,
    advertiserFriendliness: matched.adFriendly,
    recommendedMonetization: matched.channels,
    policyWarnings: matched.warnings,
    formatNotes: {
      shorts: format === "short" ? formatNote(matched) : "",
      longForm: format === "long" ? formatNote(matched) : "",
    },
    insight: buildInsight(matched, format),
  };
}

function buildInsight(matched: (typeof TIERS)[number], format: "long" | "short"): string {
  const prefix = matched.monetizable === "yes"
    ? `${matched.label} has strong monetization potential.`
    : matched.monetizable === "limited"
      ? `${matched.label} has limited monetization potential.`
      : `${matched.label} is difficult to monetize on YouTube in 2026.`;

  const adNote = matched.adSense === "high"
    ? " AdSense performs well, especially with US/UK audiences."
    : matched.adSense === "medium"
      ? " AdSense provides moderate revenue — diversify with other channels."
      : matched.adSense === "low"
        ? " AdSense revenue will be low — don't rely on it."
        : " AdSense is at risk — YouTube may limit or deny ads on this content.";

  const originalityNote = matched.originalityRisk === "high"
    ? " High risk of reused content flags — ensure original commentary and transformation."
    : matched.originalityRisk === "medium"
      ? " Some risk of reused content flags — add unique value to each video."
      : "";

  const formatAdvice = format === "short"
    ? " For Shorts, focus on volume and retention — RPM is very low."
    : " Long-form with mid-roll ads works best for this niche.";

  const warningNote = matched.warnings.length > 0
    ? ` Watch out: ${matched.warnings[0]}.`
    : "";

  return `${prefix}${adNote}${originalityNote}${formatAdvice}${warningNote}`;
}
