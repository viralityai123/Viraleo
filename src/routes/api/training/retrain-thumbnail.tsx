import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

interface AggregatedWeights {
  faceBonus: number;
  expressionBonuses: Record<string, number>;
  sceneBonuses: Record<string, number>;
  textOverlayBonus: number;
  contrastBonus: number;
  brightnessBonus: number;
  saturationBonus: number;
  synergyBonus: number;
  sampleCount: number;
  positiveCount: number;
  negativeCount: number;
  trainedAt: number;
}

export const retrainThumbnailMl = createServerFn({ method: "POST" }).handler(async () => {
  // This handler requires Cloudflare R2 bindings, which are not available on Vercel.
  if (!process.env.TRAINING_BUCKET) {
    return {
      trained: false,
      reason: "Training bucket not available on this platform",
      recordCount: 0,
      timestamp: Date.now(),
    };
  }

  const PREFIX = "thumbnail-feedback/";

  let records: any[] = [];
  let cursor: string | undefined;

  try {
    // List and collect all training records
    do {
      const listResult = await (process.env as any).TRAINING_BUCKET?.list({
        prefix: PREFIX,
        cursor,
      });
      if (!listResult) break;
      cursor = listResult.cursor;

      for (const obj of listResult.objects) {
        const data = await (process.env as any).TRAINING_BUCKET?.get(obj.key);
        if (data) {
          const text = await data.text();
          records.push(JSON.parse(text));
        }
      }
    } while (cursor);

    if (records.length === 0) {
      return {
        trained: false,
        reason: "No training records found",
        recordCount: 0,
        timestamp: Date.now(),
      };
    }

    // Aggregate features
    const positive = records.filter((r) => r.feedback === "positive");
    const negative = records.filter((r) => r.feedback === "negative");

    const aggregated: AggregatedWeights = {
      faceBonus: average(positive, "thumbnailFeatures", "faceCount", 1, 0),
      expressionBonuses: {
        happy: average(positive, "thumbnailFeatures", "dominantExpression", "happy", 1.5, 0),
        surprised: average(
          positive,
          "thumbnailFeatures",
          "dominantExpression",
          "surprised",
          2.0,
          0,
        ),
        neutral: average(positive, "thumbnailFeatures", "dominantExpression", "neutral", 0.5, 0),
      },
      sceneBonuses: {
        closeUpFace: average(positive, "thumbnailFeatures", "sceneType", "close-up face", 2.7, 0),
        screenshot: average(positive, "thumbnailFeatures", "sceneType", "screenshot", -1.3, 0),
      },
      textOverlayBonus: average(positive, "thumbnailFeatures", "textAreaRatio", 0.3, 0.5),
      contrastBonus: average(positive, "thumbnailFeatures", "contrast", 0.6, 0.3),
      brightnessBonus: average(positive, "thumbnailFeatures", "brightness", 0.5, 0.3),
      saturationBonus: average(positive, "thumbnailFeatures", "saturation", 0.4, 0.3),
      synergyBonus: average(positive, "thumbnailFeatures", "titleOcrSynergy", 1, 0.5),
      sampleCount: records.length,
      positiveCount: positive.length,
      negativeCount: negative.length,
      trainedAt: Date.now(),
    };

    // Store aggregated weights
    await (process.env as any).MODEL_BUCKET?.put(
      "thumbnail-weights.json",
      JSON.stringify(aggregated, null, 2),
      { contentType: "application/json" },
    );

    return {
      trained: true,
      recordCount: records.length,
      positiveCount: positive.length,
      negativeCount: negative.length,
      timestamp: Date.now(),
    };
  } catch (err: any) {
    console.error("Retrain failed:", err);
    return {
      trained: false,
      error: err.message,
      recordCount: records.length,
      timestamp: Date.now(),
    };
  }
});

function average(
  records: any[],
  parentKey: string,
  field: string,
  subKeyOrThreshold?: string | number,
  positiveVal?: number,
  negativeVal?: number,
): number {
  let sum = 0;
  let count = 0;
  for (const r of records) {
    const parent = r[parentKey];
    if (!parent) continue;
    const val = parent[field];
    if (val === undefined) continue;

    if (typeof subKeyOrThreshold === "string") {
      if (val === subKeyOrThreshold) {
        sum += positiveVal ?? 1;
        count++;
      } else if (negativeVal !== undefined) {
        sum += negativeVal;
        count++;
      }
    } else if (typeof subKeyOrThreshold === "number") {
      if (val > subKeyOrThreshold) {
        sum += positiveVal ?? val;
        count++;
      } else if (negativeVal !== undefined) {
        sum += negativeVal;
        count++;
      }
    } else {
      sum += val;
      count++;
    }
  }
  return count > 0 ? +(sum / count).toFixed(3) : 0;
}

export const Route = createFileRoute("/api/training/retrain-thumbnail")({
  component: RetrainPage,
});

function RetrainPage() {
  return (
    <div className="min-h-screen bg-surface text-ink font-text flex items-center justify-center">
      <p className="text-ink-soft">POST to retrain thumbnail ML model</p>
    </div>
  );
}
