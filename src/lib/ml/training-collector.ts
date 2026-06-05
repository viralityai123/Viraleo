import type { TrainingRecord, VideoFeatures } from "./types";
import type { DropoffPrediction } from "@/lib/dropoff";
import { submitTrainingData } from "./server";

const SESSION_KEY = "viraleo:sessionId";

function sessionId(): string {
  if (typeof sessionStorage === "undefined") return "anon";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function collectTrainingData(
  features: VideoFeatures | undefined,
  prediction: DropoffPrediction,
  feedback?: "positive" | "negative",
  feedbackNote?: string,
): TrainingRecord {
  return {
    features,
    heuristicPrediction: {
      markers: prediction.markers.map((m) => ({
        timestamp: m.timestamp,
        reason: m.reason,
        severity: m.severity,
      })),
      retentionCurve: prediction.retentionCurve,
    },
    feedback,
    feedbackNote,
    uploadedAt: Date.now(),
    sessionId: sessionId(),
  };
}

const queue: TrainingRecord[] = [];
let flushing = false;

export function queueTrainingRecord(record: TrainingRecord) {
  queue.push(record);
  if (!flushing) {
    flushing = true;
    setTimeout(flushQueue, 5000);
  }
}

async function flushQueue() {
  if (queue.length === 0) {
    flushing = false;
    return;
  }
  const batch = queue.splice(0);
  try {
    await submitTrainingData({ data: { records: batch } });
  } catch {
    // silent fail — data collection should never block UX
  }
  flushing = false;
}
