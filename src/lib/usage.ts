const USAGE_KEY = "viraleo:usage";

export interface UsageDay {
  date: string;
  thumbnailTest: number;
  nicheRanker: number;
  shadowban: number;
  preAnalysis: number;
  total: number;
}

function getWeekDays(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function loadUsage(): Record<string, UsageDay> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUsage(data: Record<string, UsageDay>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(USAGE_KEY, JSON.stringify(data));
}

export function recordUsage(
  feature: "thumbnailTest" | "nicheRanker" | "shadowban" | "preAnalysis",
) {
  const data = loadUsage();
  const today = new Date().toISOString().slice(0, 10);
  if (!data[today]) {
    data[today] = {
      date: today,
      thumbnailTest: 0,
      nicheRanker: 0,
      shadowban: 0,
      preAnalysis: 0,
      total: 0,
    };
  }
  data[today][feature] += 1;
  data[today].total += 1;
  saveUsage(data);
}

export function getUsageWeek(): UsageDay[] {
  const data = loadUsage();
  const days = getWeekDays();
  return days.map(
    (d) =>
      data[d] || {
        date: d,
        thumbnailTest: 0,
        nicheRanker: 0,
        shadowban: 0,
        preAnalysis: 0,
        total: 0,
      },
  );
}

export function getFeatureBreakdown(): { label: string; value: number; color: string }[] {
  const week = getUsageWeek();
  const totals = { thumbnailTest: 0, nicheRanker: 0, shadowban: 0, preAnalysis: 0 };
  for (const day of week) {
    totals.thumbnailTest += day.thumbnailTest;
    totals.nicheRanker += day.nicheRanker;
    totals.shadowban += day.shadowban;
    totals.preAnalysis += day.preAnalysis;
  }
  return [
    { label: "Thumbnail Test", value: totals.thumbnailTest, color: "bg-purple-500" },
    { label: "Niche Ranker", value: totals.nicheRanker, color: "bg-amber-500" },
    { label: "Shadowban Detector", value: totals.shadowban, color: "bg-rose-500" },
    { label: "Pre-Analysis", value: totals.preAnalysis, color: "bg-emerald-500" },
  ];
}
