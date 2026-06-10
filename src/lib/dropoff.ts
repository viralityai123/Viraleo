export type DropoffSeverity = "low" | "medium" | "high";

export interface DropoffMarker {
  timestamp: number;
  reason:
    | "Low novelty"
    | "Cut gap"
    | "Audio dip"
    | "Pacing slump"
    | "Hook fade"
    | "Energy plateau"
    | "Micro drop";
  severity: DropoffSeverity;
  fixHint: string;
  confidence: number;
}

export interface DropoffMeta {
  durationSec: number;
  cutDensity: number;
  audioEnergy: number;
  hookScore: number;
}

export interface DropoffPrediction {
  markers: DropoffMarker[];
  microMarkers: { timestamp: number; severity: DropoffSeverity }[];
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
}

const HINTS: Record<string, string[]> = {
  "Low novelty": [
    "Front-load a stronger visual or audio hit before 0:03.",
    "Open with a pattern interrupt — text overlay, quick zoom, or unexpected sound.",
    "The first 2 seconds need a curiosity spike. Add a hook title card.",
    "Slice the first shot tighter — every frame before 0:03 must earn retention.",
  ],
  "Cut gap": [
    "Tighten this stretch — viewers drift when cuts go quiet.",
    "Pacing drags here. Insert B-roll, overlay text, or a quick transition.",
    "Break up long takes with reverse shots or archival clips.",
    "This section needs a visual refresh every 3-4 seconds.",
  ],
  "Audio dip": [
    "Layer ambient or duck-then-rise — energy gap kills retention.",
    "Add a subtle riser or low drone to bridge the silence.",
    "Audio energy drops here. Introduce a sound design element to carry momentum.",
    "The quiet gap will lose impatient viewers. Layer room tone or a soft beat.",
  ],
  "Pacing slump": [
    "Promise a payoff or tease the next idea to carry to the end.",
    "Give viewers a reason to stay — upcoming hook preview works well here.",
    "This is where scrolling happens. Add a mini-payoff or a 'coming next' tease.",
    "Insert a quick pattern interrupt to reset attention before the finale.",
  ],
  "Hook fade": [
    "The opening hook loses steam by this point. Re-engage with a new angle.",
    "Viewer curiosity is fading. Introduce a surprise element or stat drop.",
    "This is the 'should I stay?' moment. Answer with a visual shift or direct address.",
    "The hook premise needs reinforcement. Circle back with a stronger visual.",
  ],
  "Energy plateau": [
    "Energy levels flatline here. Layer in motion graphics or a pacing spike.",
    "The visual rhythm is too consistent. Break it with a speed ramp or cutaway.",
    "Add a dynamic element — kinetic typography, quick zoom, or flash transition.",
    "Plateau detection: insert a highlight moment or reveal to restore momentum.",
  ],
};

function hashMeta(durationSec: number, cutDensity: number, audioEnergy: number, hookScore: number): number {
  let h = (durationSec * 100 + hookScore * 10 + cutDensity * 50) | 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number, offset: number): T {
  const idx = Math.abs(seed + offset * 7919) % arr.length;
  return arr[idx];
}

function clip(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function retentionGrade(v: number): DropoffPrediction["retentionGrade"] {
  if (v >= 75) return "A+";
  if (v >= 60) return "A";
  if (v >= 48) return "B";
  if (v >= 36) return "C";
  if (v >= 25) return "D";
  return "F";
}

function avgViewDuration(curve: { t: number; v: number }[]): number {
  let totalWeighted = 0;
  let totalWeight = 0;
  for (let i = 1; i < curve.length; i++) {
    const avg = (curve[i - 1].v + curve[i].v) / 2;
    const dt = curve[i].t - curve[i - 1].t;
    totalWeighted += avg * dt;
    totalWeight += dt;
  }
  if (totalWeight <= 0) return 0;
  const pct = totalWeighted / totalWeight / 100;
  return Math.round(curve[curve.length - 1].t * pct);
}

export function predictDropoffs(meta: DropoffMeta): DropoffPrediction {
  const { durationSec, cutDensity, audioEnergy, hookScore } = meta;
  const isShort = durationSec <= 60;

  const cacheKey = `ml:${durationSec}:${cutDensity}:${audioEnergy}:${hookScore}`;
  try {
    const cached = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(cacheKey) : null;
    if (cached) return JSON.parse(cached) as DropoffPrediction;
  } catch {
    /* ignore cache miss */
  }

  const h = hashMeta(durationSec, cutDensity, audioEnergy, hookScore);

  const markers: DropoffMarker[] = [];

  // Hook-window risk
  const hookThreshold = isShort ? 75 : 80;
  if (hookScore < hookThreshold) {
    const hookTs = isShort ? 0.3 : 0.5;
    const rawConf = clip(95 - (hookThreshold - hookScore) * 1.2, 60, 96);
    markers.push({
      timestamp: hookTs,
      reason: "Low novelty",
      severity: hookScore < 60 ? "high" : hookScore < 75 ? "medium" : "low",
      confidence: Math.round(rawConf),
      fixHint: pick(HINTS["Low novelty"], h, 1),
    });
  }

  if (hookScore >= 55 && hookScore <= 85) {
    const fadeTs = isShort ? 2.5 : 5;
    const fadeConf = clip(85 - (85 - hookScore) * 2.5, 55, 92);
    markers.push({
      timestamp: fadeTs,
      reason: "Hook fade",
      severity: hookScore < 70 ? "medium" : "low",
      confidence: Math.round(fadeConf),
      fixHint: pick(HINTS["Hook fade"], h, 2),
    });
  }

  if (durationSec > 20 && cutDensity < 0.65) {
    const gapPct = isShort ? 0.37 : 0.35;
    const gapTs = +(durationSec * gapPct).toFixed(1);
    const gapConf = clip(93 - (0.65 - cutDensity) * 80, 50, 95);
    const sev: DropoffSeverity = cutDensity < 0.45 ? "high" : cutDensity < 0.55 ? "medium" : "low";
    markers.push({
      timestamp: gapTs,
      reason: "Cut gap",
      severity: sev,
      confidence: Math.round(gapConf),
      fixHint: pick(HINTS["Cut gap"], h, 3),
    });
  }

  if (audioEnergy < 0.75) {
    const dipPct = isShort ? 0.55 : 0.57;
    const dipTs = +(durationSec * dipPct).toFixed(1);
    const dipConf = clip(90 - (0.75 - audioEnergy) * 70, 50, 94);
    const sev: DropoffSeverity = audioEnergy < 0.45 ? "high" : audioEnergy < 0.6 ? "medium" : "low";
    markers.push({
      timestamp: dipTs,
      reason: "Audio dip",
      severity: sev,
      confidence: Math.round(dipConf),
      fixHint: pick(HINTS["Audio dip"], h, 4),
    });
  }

  if (durationSec > 30 && cutDensity < 0.7 && audioEnergy < 0.8) {
    const pltPct = isShort ? 0.65 : 0.62;
    const pltTs = +(durationSec * pltPct).toFixed(1);
    const pltConf = clip(82 - (0.7 - cutDensity) * 50, 45, 90);
    markers.push({
      timestamp: pltTs,
      reason: "Energy plateau",
      severity: cutDensity < 0.5 && audioEnergy < 0.5 ? "high" : "medium",
      confidence: Math.round(pltConf),
      fixHint: pick(HINTS["Energy plateau"], h, 5),
    });
  }

  const slumpTs = +(durationSec * (isShort ? 0.82 : 0.84)).toFixed(1);
  markers.push({
    timestamp: slumpTs,
    reason: "Pacing slump",
    severity: "low",
    confidence: 78,
    fixHint: pick(HINTS["Pacing slump"], h, 6),
  });

  markers.sort((a, b) => a.timestamp - b.timestamp);

  // Micro-markers — deterministic positions between main markers
  const microMarkers: { timestamp: number; severity: DropoffSeverity }[] = [];
  for (let i = 0; i < markers.length - 1; i++) {
    const mid = +((markers[i].timestamp + markers[i + 1].timestamp) / 2).toFixed(1);
    if (markers.some((m) => Math.abs(m.timestamp - mid) < 2)) continue;
    microMarkers.push({ timestamp: mid, severity: "low" });
  }

  // Retention curve
  const steps = Math.max(40, Math.min(100, Math.round(durationSec * 1.5)));
  const baseDecay = clip(42 - cutDensity * 10 - audioEnergy * 6, 28, 55);
  const curve = Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * durationSec;
    let v = 100 - (i / steps) * baseDecay;
    for (const m of markers) {
      const dist = Math.abs(t - m.timestamp);
      const sigma = 1.8;
      const penalty = m.severity === "high" ? 16 : m.severity === "medium" ? 10 : 5;
      const hit = penalty * Math.exp(-(dist * dist) / (2 * sigma * sigma));
      v -= hit;
    }
    for (const m of microMarkers) {
      const dist = Math.abs(t - m.timestamp);
      const hit = 2.5 * Math.exp(-(dist * dist) / 4);
      v -= hit;
    }
    return { t, v: +clip(Math.round(v * 10) / 10, 22, 100) };
  });

  // Confidence bands
  const bandWidth = clip(8 - cutDensity * 3 - audioEnergy * 2, 3, 12);
  const lowerCurve = curve.map((p) => ({
    t: p.t,
    v: +clip(p.v - bandWidth, 18, 100).toFixed(1),
  }));
  const upperCurve = curve.map((p) => ({
    t: p.t,
    v: +clip(p.v + bandWidth, 18, 100).toFixed(1),
  }));

  const at = (sec: number) => {
    const clamped = clip(sec, 0, durationSec);
    const point = curve.reduce((p, c) =>
      Math.abs(c.t - clamped) < Math.abs(p.t - clamped) ? c : p,
    );
    return Math.round(point.v);
  };

  const retentionAt = {
    five: at(5),
    fifteen: at(Math.min(15, durationSec)),
    thirty: at(Math.min(30, durationSec)),
    sixty: at(Math.min(60, durationSec)),
    midpoint: at(durationSec * 0.5),
    end: at(durationSec),
  };

  const avgView = avgViewDuration(curve);
  const grade = retentionGrade(retentionAt.end);

  const nicheAvgEnd = isShort ? 55 : 45;
  const vsNiche = Math.round(retentionAt.end - nicheAvgEnd);

  const result: DropoffPrediction = {
    markers,
    microMarkers,
    retentionCurve: curve,
    lowerCurve,
    upperCurve,
    retentionAt,
    estimatedAvgViewDuration: avgView,
    retentionGrade: grade,
    vsNicheAverage: vsNiche,
  };

  try {
    if (typeof sessionStorage !== "undefined")
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
  } catch {}

  return result;
}

export function formatTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}