import type { ThumbnailFeatures, SceneType } from "./thumbnail-types";
import * as faceapi from "face-api.js";
import Tesseract from "tesseract.js";

let faceModelsLoaded = false;
let faceModelsLoading: Promise<void> | null = null;

async function ensureFaceModels(): Promise<void> {
  if (faceModelsLoaded) return;
  if (faceModelsLoading) return faceModelsLoading;
  faceModelsLoading = (async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(
        "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/build/commonjs/weights/",
      );
      await faceapi.nets.faceExpressionNet.loadFromUri(
        "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/build/commonjs/weights/",
      );
      faceModelsLoaded = true;
    } catch {
      // Models unavailable — face features will use fallback
    }
  })();
  await faceModelsLoading;
}

export async function extractThumbnailFeatures(
  base64: string,
  title: string,
  isShort: boolean,
): Promise<ThumbnailFeatures> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to decode thumbnail"));
    i.src = base64;
  });

  const W = img.width;
  const H = img.height;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, W, H);
  const d = imageData.data;

  // ── 1. Luminance & Brightness ──────────────────────────────────────────
  const L = new Float64Array(W * H);
  let sumL = 0;
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    L[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    sumL += L[i];
  }
  const avgBrightness = sumL / (W * H) / 255;

  let varL = 0;
  for (let i = 0; i < W * H; i++) varL += (L[i] / 255 - avgBrightness) ** 2;
  const brightnessVariance = varL / (W * H);
  const contrast = Math.sqrt(brightnessVariance);

  // ── 2. HSV ────────────────────────────────────────────────────────────
  const H_ = new Float32Array(W * H);
  const S = new Float32Array(W * H);
  const V = new Float32Array(W * H);
  let sumS = 0, warmPixels = 0, skinPixels = 0;

  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), delta = mx - mn;
    let h = 0, s = 0, v = mx;
    if (delta > 0.001) {
      s = delta / mx;
      if (mx === r) h = ((g - b) / delta) % 6;
      else if (mx === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    H_[i] = h; S[i] = s * 100; V[i] = v * 100;
    sumS += s;
    if ((h >= 0 && h <= 30) || h >= 340) warmPixels++;
    if (h >= 0 && h <= 50 && s > 0.1 && v > 0.2 && v < 0.9) skinPixels++;
  }
  const saturation = sumS / (W * H);
  const warmthRatio = warmPixels / (W * H);
  const skinPixelRatio = skinPixels / (W * H);
  const popScore = saturation * 0.6 + warmthRatio * 0.4;

  // ── 3. Sobel edge detection ──────────────────────────────────────────
  const gray = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) gray[i] = L[i];

  const sobelH = sobelHorizontal(gray, W, H);
  const sobelV = sobelVertical(gray, W, H);
  const mag = new Float64Array(W * H);
  let sumMag = 0;
  for (let i = 0; i < W * H; i++) {
    mag[i] = Math.sqrt(sobelH[i] ** 2 + sobelV[i] ** 2);
    sumMag += mag[i];
  }
  const edgeDensity = sumMag / (W * H) / 255;
  const complexityScore = 1 - Math.abs(edgeDensity - 0.25) / 0.75;

  const stripH = Math.floor(H / 6);
  let textStrips = 0;
  for (let s = 0; s < 6; s++) {
    const yStart = s * stripH;
    let stripSum = 0, count = 0;
    for (let y = yStart; y < yStart + stripH && y < H; y++)
      for (let x = 0; x < W; x++) { stripSum += sobelH[y * W + x]; count++; }
    if (stripSum / count / 255 > 0.15) textStrips++;
  }
  const textAreaRatio = textStrips / 6;

  // ── 4. Rule of Thirds ─────────────────────────────────────────────────
  const thirdsScore = computeThirdsScore(mag, W, H);

  // ── 5. Safe zone (Shorts) ─────────────────────────────────────────────
  let safeZoneScore = 1;
  if (isShort) {
    const forbidBottom = Math.floor(H * 0.85);
    const forbidRight = Math.floor(W * 0.88);
    let forbiddenFeatures = 0, totalFeatures = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (sobelH[i] > 30) { totalFeatures++; if (y >= forbidBottom || x >= forbidRight) forbiddenFeatures++; }
      }
    const overlapRatio = totalFeatures > 0 ? forbiddenFeatures / totalFeatures : 0;
    safeZoneScore = Math.max(0, Math.min(1, 1 - overlapRatio * 2));
  }

  // ── 6. Color Dominance (HHI) ───────────────────────────────────────────
  const hueBins = new Array(12).fill(0);
  for (let i = 0; i < W * H; i++) hueBins[Math.min(11, Math.floor(H_[i] / 30))]++;
  const totalPixels = W * H;
  const shares = hueBins.map((c) => c / totalPixels);
  const hhi = shares.reduce((a, s) => a + s * s, 0);
  const dominanceScore = Math.max(0, Math.min(1, (hhi - 0.15) / 0.6));

  // ── 7. Real Face Detection (face-api.js) ──────────────────────────────
  let faceCount = 0, hasFace = false;
  let faceExpressions: ThumbnailFeatures["faceExpressions"] = { happy: 0, surprised: 0, neutral: 0.5, sad: 0, angry: 0 };
  let faceSizes: number[] = [];

  await ensureFaceModels();
  if (faceModelsLoaded) {
    try {
      const detections = await faceapi
        .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
        .withFaceExpressions();
      faceCount = detections.length;
      hasFace = faceCount > 0;
      faceSizes = detections.map((d) => d.detection.box.area / (W * H));
      if (faceCount > 0) {
        // Average expressions across all faces
        const avgExp: Record<string, number[]> = { happy: [], surprised: [], neutral: [], sad: [], angry: [] };
        for (const det of detections) {
          for (const key of Object.keys(avgExp)) {
            avgExp[key].push((det.expressions as any)[key] ?? 0);
          }
        }
        faceExpressions = Object.fromEntries(
          Object.entries(avgExp).map(([k, vals]) => [k, vals.reduce((a, b) => a + b, 0) / vals.length]),
        ) as ThumbnailFeatures["faceExpressions"];
      }
    } catch {
      // face detection failed, use fallback
    }
  }

  // ── 8. Real OCR (tesseract.js) ────────────────────────────────────────
  let ocrText = "";
  let ocrWords: string[] = [];
  try {
    const { data } = await Tesseract.recognize(canvas, "eng", {
      logger: () => {},
    });
    ocrText = data.text;
    if ((data as any).words) {
      ocrWords = (data as any).words.map((w: { text: string }) => w.text.toLowerCase());
    } else if ((data as any).lines) {
      for (const line of (data as any).lines)
        for (const w of line.words || []) ocrWords.push((w.text || "").toLowerCase());
    }
  } catch {
    // OCR failed
  }

  // ── 9. Scene Classification ───────────────────────────────────────────
  const sceneType = classifyScene(faceCount, faceSizes, textAreaRatio, edgeDensity, popScore, saturation);

  // ── 10. Title-OCR Synergy ────────────────────────────────────────────
  const titleKeywords = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const stopWords = new Set(["this", "that", "with", "from", "have", "been", "were", "what", "when", "where", "which", "their", "your", "they", "them", "some", "could", "would", "should", "about", "there", "after", "before", "just", "also", "than", "then", "very", "more"]);
  const filteredKeywords = titleKeywords.filter((w) => !stopWords.has(w));

  let synergyMatchCount = 0;
  for (const kw of filteredKeywords) {
    if (ocrWords.some((ow) => ow.includes(kw) || kw.includes(ow))) synergyMatchCount++;
  }
  const titleSynergyScore = filteredKeywords.length > 0
    ? synergyMatchCount / filteredKeywords.length
    : 0;
  const alignmentScore = titleSynergyScore * 0.7 + 0.3;

  // ── 11. Derived Metric Scores ─────────────────────────────────────────
  const visualContrast = clamp(contrast * 12, 0, 10);
  const textReadability = clamp((1 - Math.abs(textAreaRatio - 0.18) * 3) * 10, 0, 10);
  const topicRelevance = clamp((alignmentScore * 0.7 + dominanceScore * 0.3) * 10, 0, 10);
  const faceExpressionBonus = hasFace && faceExpressions.surprised > 0.5 ? 2 : hasFace && faceExpressions.happy > 0.5 ? 1.5 : hasFace ? 1 : 0;
  const clickPsychology = clamp(faceExpressionBonus + popScore * 4 + contrast * 3, 0, 10);

  // ── 12. Predicted CTR ─────────────────────────────────────────────────
  const predictedCtr = computeCtr(
    sceneType, hasFace, faceExpressions, textAreaRatio, popScore, titleSynergyScore,
    thirdsScore, complexityScore, avgBrightness, safeZoneScore, dominanceScore, contrast,
  );

  return {
    width: W, height: H,
    avgBrightness: +avgBrightness.toFixed(4),
    brightnessVariance: +brightnessVariance.toFixed(4),
    contrast: +contrast.toFixed(4),
    hasFace, faceCount, faceExpressions, faceSizes,
    skinPixelRatio: +skinPixelRatio.toFixed(4),
    ocrText, ocrWords,
    textAreaRatio: +textAreaRatio.toFixed(4),
    titleSynergyScore: +titleSynergyScore.toFixed(4),
    saturation: +saturation.toFixed(4),
    warmthRatio: +warmthRatio.toFixed(4),
    popScore: +popScore.toFixed(4),
    edgeDensity: +edgeDensity.toFixed(4),
    complexityScore: +complexityScore.toFixed(4),
    thirdsScore: +thirdsScore.toFixed(4),
    safeZoneScore: +safeZoneScore.toFixed(4),
    colorDominanceHhi: +hhi.toFixed(4),
    dominanceScore: +dominanceScore.toFixed(4),
    sceneType,
    titleAlignmentScore: +alignmentScore.toFixed(4),
    predictedCtr: +predictedCtr.toFixed(4),
    metricScores: {
      visualContrast: +visualContrast.toFixed(1),
      textReadability: +textReadability.toFixed(1),
      topicRelevance: +topicRelevance.toFixed(1),
      clickPsychology: +clickPsychology.toFixed(1),
    },
  };
}

// ── Sobel operators ─────────────────────────────────────────────────────────

function sobelHorizontal(gray: Float64Array, W: number, H: number): Float64Array {
  const out = new Float64Array(W * H);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      out[i] = -gray[i - W - 1] - 2 * gray[i - 1] - gray[i + W - 1] + gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1];
    }
  return out;
}

function sobelVertical(gray: Float64Array, W: number, H: number): Float64Array {
  const out = new Float64Array(W * H);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      out[i] = -gray[i - W - 1] + gray[i - W + 1] - 2 * gray[i + W - 1] + 2 * gray[i + W + 1] - gray[i - 1] + gray[i + 1];
    }
  return out;
}

// ── Rule of Thirds ─────────────────────────────────────────────────────────

function computeThirdsScore(mag: Float64Array, W: number, H: number): number {
  const thirdW = Math.floor(W / 3), thirdH = Math.floor(H / 3);
  let intersectSum = 0, centerSum = 0;
  for (const [gx, gy] of [[1, 1], [1, 3], [3, 1], [3, 3]]) {
    const xStart = (gx - 1) * thirdW, yStart = (gy - 1) * thirdH;
    for (let y = yStart; y < yStart + thirdH && y < H; y++)
      for (let x = xStart; x < xStart + thirdW && x < W; x++)
        intersectSum += mag[y * W + x];
  }
  const cxStart = 1 * thirdW, cyStart = 1 * thirdH;
  for (let y = cyStart; y < cyStart + thirdH && y < H; y++)
    for (let x = cxStart; x < cxStart + thirdW && x < W; x++)
      centerSum += mag[y * W + x];
  return intersectSum / (intersectSum + centerSum + 0.01);
}

// ── Scene Classification ────────────────────────────────────────────────────

function classifyScene(
  faceCount: number, faceSizes: number[], textAreaRatio: number,
  edgeDensity: number, popScore: number, saturation: number,
): SceneType {
  const maxFaceSize = faceSizes.length > 0 ? Math.max(...faceSizes) : 0;
  if (faceCount === 1 && maxFaceSize > 0.15) return "close-up face";
  if (faceCount > 1) return "group people";
  if (textAreaRatio > 0.4) return "text overlay";
  if (edgeDensity < 0.08) return "screenshot";
  if (popScore > 0.7 && saturation > 0.5) return "color pop";
  if (edgeDensity > 0.35) return "high energy";
  return "mixed";
}

// ── CTR Prediction ─────────────────────────────────────────────────────────

function computeCtr(
  sceneType: SceneType,
  hasFace: boolean,
  faceExpressions: { happy: number; surprised: number; neutral: number; sad: number; angry: number },
  textAreaRatio: number,
  popScore: number,
  titleSynergyScore: number,
  thirdsScore: number,
  complexityScore: number,
  avgBrightness: number,
  safeZoneScore: number,
  dominanceScore: number,
  contrast = 0.5,
): number {
  const ctrBaseline = 0.045;

  const sceneBoosts: Record<string, number> = {
    "close-up face": 0.027,
    "group people": 0.015,
    "text overlay": 0.023,
    "product shot": 0.006,
    "screenshot": -0.013,
    "high energy": 0.018,
    "color pop": 0.014,
    "mixed": 0.010,
  };
  const sceneBonus = sceneBoosts[sceneType] ?? 0.010;

  // Face expression bonus
  const expBonus = hasFace
    ? faceExpressions.surprised * 0.020 + faceExpressions.happy * 0.015 -
      faceExpressions.neutral * 0.005 + faceExpressions.angry * 0.008
    : 0;

  const contrastBonus = Math.min(contrast * 0.025, 0.020);
  const textOptimal = 1 - Math.abs(textAreaRatio - 0.18);
  const textBonus = textOptimal * 0.008;
  const popBonus = popScore * 0.012;
  const synergyBonus = titleSynergyScore * 0.025;
  const thirdsBonus = thirdsScore * 0.006;
  const complexityBonus = complexityScore * 0.004;
  const brightnessPenalty = avgBrightness < 0.3 ? (0.3 - avgBrightness) * 0.015 : avgBrightness > 0.8 ? (avgBrightness - 0.8) * 0.015 : 0;
  const safeZoneBonus = safeZoneScore * 0.006;
  const dominanceBonus = dominanceScore * 0.002;

  const ctr = ctrBaseline + sceneBonus + expBonus + contrastBonus + textBonus +
    popBonus + synergyBonus + thirdsBonus + complexityBonus - brightnessPenalty +
    safeZoneBonus + dominanceBonus;

  return Math.max(0.005, Math.min(0.25, ctr));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
