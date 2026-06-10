/** Normalize LLM scores that may arrive as 0–10 or 0–100 into a consistent 0–10 display scale. */
export function toTenScale(score: number): number {
  if (score <= 0) return 0;
  if (score <= 10) return Math.round(score * 10) / 10;
  return Math.round((score / 10) * 10) / 10;
}

export function letterGradeTen(n: number): string {
  if (n >= 9) return "A+";
  if (n >= 8) return "A";
  if (n >= 7) return "B";
  if (n >= 5.5) return "C";
  return "D";
}

export function normalizeThumbnailScores<
  T extends {
    overallScore: number;
    metrics?: { label: string; score: number; copy: string }[];
  },
>(data: T): T {
  return {
    ...data,
    overallScore: toTenScale(data.overallScore),
    metrics: data.metrics?.map((m) => ({
      ...m,
      score: toTenScale(m.score),
    })),
  };
}
