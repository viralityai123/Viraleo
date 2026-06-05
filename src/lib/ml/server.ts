import { createServerFn } from "@tanstack/react-start";
import type { TrainingRecord } from "./types";

export const submitTrainingData = createServerFn({ method: "POST" })
  .inputValidator((d: { records: TrainingRecord[] }) => d)
  .handler(async ({ data }) => {
    console.log(`[Training] Received ${data.records.length} records`);
    for (const record of data.records) {
      if (record.nicheFeatures) {
        console.log(
          `[Training] session=${record.sessionId} feedback=${record.feedback} niche="${record.nicheFeatures.wordCount}w specificity=${record.nicheFeatures.specificityRatio}`,
        );
      } else if (record.thumbnailFeatures) {
        console.log(
          `[Training] session=${record.sessionId} feedback=${record.feedback} thumbnail=${record.thumbnailFeatures.width}x${record.thumbnailFeatures.height} ctr=${record.thumbnailFeatures.predictedCtr}`,
        );
      } else {
        console.log(
          `[Training] session=${record.sessionId} feedback=${record.feedback} features=${record.features?.frameThumbnails.length ?? 0}frames`,
        );
      }
    }
    return { ok: true };
  });
