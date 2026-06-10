export interface ThumbnailFeatures {
  width: number;
  height: number;
  avgBrightness: number;
  brightnessVariance: number;
  contrast: number;
  hasFace: boolean;
  faceCount: number;
  faceExpressions: {
    happy: number;
    surprised: number;
    neutral: number;
    sad: number;
    angry: number;
  };
  faceSizes: number[];
  skinPixelRatio: number;
  ocrText: string;
  ocrWords: string[];
  textAreaRatio: number;
  titleSynergyScore: number;
  saturation: number;
  warmthRatio: number;
  popScore: number;
  edgeDensity: number;
  complexityScore: number;
  thirdsScore: number;
  safeZoneScore: number;
  colorDominanceHhi: number;
  dominanceScore: number;
  sceneType: SceneType;
  titleAlignmentScore: number;
  predictedCtr: number;
  metricScores: {
    visualContrast: number;
    textReadability: number;
    topicRelevance: number;
    clickPsychology: number;
  };
}

export type SceneType =
  | "close-up face"
  | "group people"
  | "text overlay"
  | "product shot"
  | "screenshot"
  | "high energy"
  | "color pop"
  | "mixed";

export interface ThumbnailFeedbackRecord {
  features: ThumbnailFeatures;
  llmOverallScore: number;
  llmMetrics: { label: string; score: number; copy: string }[];
  title: string;
  context: string;
  isShort: boolean;
  vote: "positive" | "negative";
  timestamp: number;
  sessionId: string;
}
