import type { VideoFeatures, MlPrediction } from "./types";

let _available: boolean | null = null;

export function isMlAvailable(): boolean {
  if (_available !== null) return _available;
  _available = !!(typeof process !== "undefined" && (process as any).env?.ML_INFERENCE_URL);
  return _available;
}

export async function predictWithMl(features: VideoFeatures): Promise<MlPrediction | null> {
  const endpoint = typeof process !== "undefined" ? (process as any).env?.ML_INFERENCE_URL : "";
  if (!endpoint) return null;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as MlPrediction;
  } catch {
    return null;
  }
}
