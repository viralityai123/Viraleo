export interface VideoFeatures {
  durationSec: number;
  width: number;
  height: number;
  fileSize: number;
  frameThumbnails: string[];
  frameDiffs: number[];
  brightnessValues: number[];
  facePresent: boolean[];
  textPresent: number;
  audioEnergy: number[];
  silenceRatio: number;
  audioVariance: number;
  cutDensity: number;
  motionScore: number;
}

export interface MlPrediction {
  markers: {
    timestamp: number;
    reason: string;
    severity: "low" | "medium" | "high";
    confidence: number;
    fixHint: string;
  }[];
  microMarkers: { timestamp: number; severity: "low" | "medium" | "high" }[];
  retentionCurve: { t: number; v: number }[];
  lowerCurve: { t: number; v: number }[];
  upperCurve: { t: number; v: number }[];
  retentionAt: {
    five: number;
    fifteen: number;
    thirty: number;
    sixty: number;
    midpoint: number;
    end: number;
  };
  estimatedAvgViewDuration: number;
  retentionGrade: "A+" | "A" | "B" | "C" | "D" | "F";
  vsNicheAverage: number;
  modelVersion: string;
}

export interface TrainingRecord {
  features?: VideoFeatures;
  thumbnailFeatures?: import("./thumbnail-types").ThumbnailFeatures;
  nicheFeatures?: import("./niche-features").NicheFeatures;
  llmScore?: number;
  llmMetrics?: { label: string; score: number; copy: string }[];
  heuristicPrediction: {
    markers: { timestamp: number; reason: string; severity: string }[];
    retentionCurve: { t: number; v: number }[];
  };
  mlPrediction?: MlPrediction;
  feedback?: "positive" | "negative";
  feedbackNote?: string;
  actualRetention?: { t: number; v: number }[];
  uploadedAt: number;
  sessionId: string;
}

export interface FeedbackEntry {
  sessionId: string;
  prediction: MlPrediction;
  vote: "positive" | "negative";
  note?: string;
  timestamp: number;
}
