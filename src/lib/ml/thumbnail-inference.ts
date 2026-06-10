import type { ThumbnailFeatures } from "./thumbnail-types";

export interface WorkersAiThumbnailResult {
  overallScore: number;
  explanation: string;
  metrics: { label: string; score: number; copy: string }[];
  ctrEstimate: number;
  modelVersion: string;
}

export async function inferThumbnailWithWorkersAi(
  base64: string,
  features: ThumbnailFeatures,
  title: string,
  context: string,
  isShort: boolean,
): Promise<WorkersAiThumbnailResult | null> {
  const endpoint =
    typeof process !== "undefined"
      ? (process as any).env?.THUMBNAIL_ML_URL || "/api/thumbnail-score"
      : "/api/thumbnail-score";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, features, title, context, isShort }),
    });
    if (!res.ok) return null;
    return (await res.json()) as WorkersAiThumbnailResult;
  } catch {
    return null;
  }
}
