import type { VideoFeatures } from "./types";

export function extractFeatures(opts: {
  frames: string[];
  audioEnergy: number[];
  durationSec: number;
  width: number;
  height: number;
  fileSize: number;
}): VideoFeatures {
  const { frames, audioEnergy, durationSec, width, height, fileSize } = opts;

  const frameDiffs: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    frameDiffs.push(pixelDelta(frames[i - 1], frames[i]));
  }

  const brightnessValues = frames.map(avgBrightness);
  const facePresent = frames.map(hasSkinRegion);
  const textPresent = frames.filter((f) => hasTextRegion(f)).length / Math.max(frames.length, 1);

  const silenceThreshold = 0.05;
  const silenceRatio =
    audioEnergy.filter((e) => e < silenceThreshold).length / Math.max(audioEnergy.length, 1);

  const avg = audioEnergy.reduce((a, b) => a + b, 0) / audioEnergy.length;
  const audioVariance = audioEnergy.reduce((a, b) => a + (b - avg) ** 2, 0) / audioEnergy.length;

  const cutThreshold = 0.25;
  const cuts = frameDiffs.filter((d) => d > cutThreshold).length;
  const cutDensity = cuts / Math.max(durationSec, 1);

  const motionScore = frameDiffs.reduce((a, b) => a + b, 0) / Math.max(frameDiffs.length, 1);

  return {
    durationSec,
    width,
    height,
    fileSize,
    frameThumbnails: frames,
    frameDiffs,
    brightnessValues,
    facePresent,
    textPresent,
    audioEnergy,
    silenceRatio,
    audioVariance,
    cutDensity,
    motionScore,
  };
}

function pixelDelta(b64a: string, b64b: string): number {
  const imgA = dataUrlToGray(b64a);
  const imgB = dataUrlToGray(b64b);
  if (!imgA || !imgB || imgA.length !== imgB.length) return 0;
  let diff = 0;
  for (let i = 0; i < imgA.length; i++) {
    diff += Math.abs(imgA[i] - imgB[i]);
  }
  return diff / imgA.length / 255;
}

function dataUrlToGray(b64: string): Uint8Array | null {
  try {
    const raw = atob(b64.split(",")[1] || "");
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const gray = new Uint8Array(Math.floor(bytes.length / 4));
    for (let i = 0; i < gray.length; i++) {
      const r = bytes[i * 4];
      const g = bytes[i * 4 + 1];
      const b = bytes[i * 4 + 2];
      gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
    return gray;
  } catch {
    return null;
  }
}

function avgBrightness(b64: string): number {
  const gray = dataUrlToGray(b64);
  if (!gray) return 0.5;
  return gray.reduce((a, b) => a + b, 0) / gray.length / 255;
}

function hasSkinRegion(b64: string): boolean {
  const gray = dataUrlToGray(b64);
  if (!gray) return false;
  const centerStart = Math.floor(gray.length * 0.3);
  const centerEnd = Math.floor(gray.length * 0.7);
  let sum = 0;
  let count = 0;
  for (let i = centerStart; i < centerEnd; i++) {
    sum += gray[i];
    count++;
  }
  const avgCenter = sum / count;
  const variance = gray.reduce((a, b) => a + (b - avgCenter) ** 2, 0) / gray.length;
  return variance > 1800 && avgCenter > 40 && avgCenter < 220;
}

function hasTextRegion(b64: string): boolean {
  const gray = dataUrlToGray(b64);
  if (!gray) return false;
  const stripSize = Math.floor(gray.length / 6);
  const strips: number[] = [];
  for (let s = 0; s < 6; s++) {
    let sum = 0;
    for (let i = s * stripSize; i < (s + 1) * stripSize; i++) sum += gray[i];
    strips.push(sum / stripSize);
  }
  const highContrastStrips = strips.filter((s) => s < 50 || s > 200);
  return highContrastStrips.length >= 2;
}
