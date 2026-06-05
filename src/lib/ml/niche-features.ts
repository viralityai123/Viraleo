export interface NicheFeatures {
  wordCount: number;
  charLength: number;
  avgWordLen: number;
  modifierCount: number;
  hasModifier: boolean;
  specificityRatio: number;
  hasAmpersand: boolean;
  hasPreposition: boolean;
  hasNumber: boolean;
  hasChannelRef: boolean;
  hasUrl: boolean;
  syllableCount: number;
  polysyllabicWords: number;
  format: "long" | "short";
}

export interface NicheHeuristic {
  viabilityScore: number;
  specificity: number;
  competitionProxy: number;
  difficulty: number;
  trendScore: number;
  trendDirection: "Rising" | "Stable" | "Declining";
  cpmMin: number;
  cpmMax: number;
  explanation: string;
}

const MODIFIERS = new Set([
  "hardcore", "extreme", "pro", "expert", "advanced", "beginner", "easy",
  "tutorial", "how", "to", "guide", "tips", "tricks", "hacks",
  "challenge", "vs", "versus", "comparison", "review", "reaction",
  "asmr", "relaxing", "satisfying", "calming", "sleep",
  "speedrun", "speed", "run", "competitive", "ranked",
  "survival", "roleplay", "rpg", "modded", "mod",
  "behind", "the", "scenes", "documentary", "deep", "dive",
  "day", "in", "life", "vlog", "daily", "weekly",
  "faceless", "no", "commentary", "voice", "over",
  "best", "top", "worst", "funny", "epic", "insane",
  "mini", "micro", "short", "long", "full", "complete",
  "part", "episode", "series", "season",
  "realistic", "cinematic", "aesthetic", "clean", "minimal",
]);

const PREPOSITIONS = new Set([
  "in", "of", "for", "with", "without", "on", "at", "by", "from",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "under", "over", "about", "against", "around",
]);

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  const vowels = "aeiouy";
  let count = 0;
  let prevWasVowel = false;
  for (const ch of word) {
    const isVowel = vowels.includes(ch);
    if (isVowel && !prevWasVowel) count++;
    prevWasVowel = isVowel;
  }
  if (word.endsWith("e")) count--;
  if (word.endsWith("le") && word.length > 2) count++;
  return Math.max(1, count);
}

export function extractNicheFeatures(niche: string, format: "long" | "short"): NicheFeatures {
  const cleaned = niche.trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charLength = cleaned.length;
  const avgWordLen = wordCount > 0 ? cleaned.replace(/\s/g, "").length / wordCount : 0;

  const lower = cleaned.toLowerCase();
  const modifierCount = words.filter((w) => MODIFIERS.has(w.toLowerCase())).length;
  const hasModifier = modifierCount > 0;
  const specificityRatio = wordCount > 0 ? modifierCount / wordCount : 0;

  const hasAmpersand = lower.includes("&") || /\bvs?\b/.test(lower);
  const hasPreposition = words.some((w) => PREPOSITIONS.has(w.toLowerCase()));
  const hasNumber = /\d/.test(cleaned);
  const hasChannelRef = lower.startsWith("@");
  const hasUrl = lower.includes("youtube.com") || lower.includes("youtu.be") || lower.startsWith("http");

  const syllableCount = words.reduce((a, w) => a + countSyllables(w), 0);
  const polysyllabicWords = words.filter((w) => countSyllables(w) > 2).length;

  return {
    wordCount,
    charLength,
    avgWordLen: +avgWordLen.toFixed(2),
    modifierCount,
    hasModifier,
    specificityRatio: +specificityRatio.toFixed(3),
    hasAmpersand,
    hasPreposition,
    hasNumber,
    hasChannelRef,
    hasUrl,
    syllableCount,
    polysyllabicWords,
    format,
  };
}

export function estimateNicheHeuristic(features: NicheFeatures): NicheHeuristic {
  const { wordCount, modifierCount, specificityRatio, hasNumber, format } = features;

  // Specificity: more words + more modifiers = more specific
  const specificity = Math.min(100, (specificityRatio * 60 + Math.min(wordCount / 8, 1) * 40) * 100);

  // Competition proxy: generic niches with few words are more competitive
  const rawCompetition = Math.max(0, 1 - specificityRatio * 1.5) * (1 - Math.min(wordCount / 10, 0.5));
  const competitionProxy = Math.min(100, rawCompetition * 100);

  // Difficulty: competition + format (shorts easier)
  const formatEase = format === "short" ? 0.75 : 1;
  const difficulty = Math.min(100, competitionProxy * formatEase);

  // Trend score: shorts generally trending up
  const trendScore = format === "short" ? 0.4 : 0.1;
  const hasTrendModifier = modifierCount > 0 ? 0.15 : 0;
  const trendDirection = trendScore + hasTrendModifier > 0.25 ? "Rising" : trendScore + hasTrendModifier < -0.1 ? "Declining" : "Stable" as const;

  // CPM: format-based + number signal bonus (specific "$X" spaces are higher value)
  const cpmBase = format === "short" ? [1, 3] : [4, 10];
  const specificityCpmBonus = hasNumber ? 1.5 : 1;
  const cpmMin = Math.round(cpmBase[0] * specificityCpmBonus);
  const cpmMax = Math.round(cpmBase[1] * specificityCpmBonus * (1 + specificityRatio * 0.5));

  // Viability: inverse of competition + trend + specificity bonus
  const viabilityScore = Math.round(
    (100 - competitionProxy * 0.6) +
    (trendScore + hasTrendModifier) * 30 +
    specificity * 0.15,
  );

  const explanation = format === "short"
    ? `${wordCount} words, ${modifierCount} modifiers — ${specificityRatio > 0.3 ? "fairly specific" : "broad"} niche in Shorts format. Shorts ${trendDirection.toLowerCase()} overall.`
    : `${wordCount} words, ${modifierCount} modifiers — ${specificityRatio > 0.3 ? "fairly specific" : "broad"} niche in long-form. Competition proxy ${Math.round(competitionProxy)}/100.`;

  return {
    viabilityScore: Math.max(0, Math.min(100, viabilityScore)),
    specificity: Math.round(specificity),
    competitionProxy: Math.round(competitionProxy),
    difficulty: Math.round(difficulty),
    trendScore: Math.round((trendScore + hasTrendModifier) * 100),
    trendDirection,
    cpmMin,
    cpmMax,
    explanation,
  };
}
