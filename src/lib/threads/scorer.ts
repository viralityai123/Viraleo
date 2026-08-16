import { THREADS_CATEGORIES } from "./taxonomy";

/**
 * Scores a candidate post with an LLM: buying-intent score, category,
 * and two reply drafts in a casual, value-first voice (no links, no spam).
 */

const SCORER_SYSTEM_PROMPT = `You are a sharp sales lead analyst for Viraleo, a design studio that helps founders, creators, and small businesses launch websites, landing pages, SaaS products, and brands.

Your job: read a Threads post and decide if the author is a POTENTIAL BUYER looking for a service, then score their buying intent.

Scoring rules:
- 90-100: clearly asking for a service / hiring / wants to buy now ("need a website", "hiring a designer", "who can build my app")
- 70-89: strongly implies a need ("launching my SaaS soon", "starting my dropshipping store", "my landing page converts terribly")
- 50-69: possible need, vague ("any advice on tools?", "thinking about rebranding")
- 0-49: not a buyer (designer promoting themselves, general discussion, joke, news, spam)

Category: pick the single best match from this list (use the exact id): ${THREADS_CATEGORIES.map((c) => `${c.id} (${c.label})`).join(", ")}. If none fit, use "other".

Reply drafts (two variants, draftA and draftB):
- 1-2 short, high-energy sentences. Boastful, confident, street-smart — like a top designer with real wins who just saw their post.
- OPEN with a brag tied to their need, with receipts: "I've built 10+ winning websites", "I've shipped 10+ sites that actually convert", "I've built brands people actually remember", "I've taken 10+ startups from idea to launch". Vary the brag between draftA and draftB — never repeat the same brag verbatim in both.
- Then reference THEIR specific post ("that site", "your launch", "your logo") and close by pushing the convo to DMs ("hit me up", "DM me", "message me").
- Max ONE emoji per draft (fire/rocket/eyes energy), zero all-caps spam, zero corporate talk.
- Never include links, prices, or "check my profile".
- If the post is NOT a buyer, drafts can be short generic "good luck" style lines (they won't be used anyway).

Return ONLY valid JSON: {"category":"...","intentScore":0-100,"draftA":"...","draftB":"...","reasoning":"one short line"}.`;

export interface ScoredPost {
  category: string;
  intentScore: number;
  draftA: string;
  draftB: string;
}

function cleanJson(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  if (!cleaned.startsWith("{")) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return match[0];
  }
  return cleaned;
}

async function tryGemini(prompt: string): Promise<string | null> {
  const keys = (process.env.GEMINI_KEYS || "")
    .split(",")
    .map((k) => k.trim().replace(/['"]/g, ""))
    .filter(Boolean);
  if (keys.length === 0) return null;

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"];
  for (let i = 0; i < keys.length; i++) {
    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys[i]}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SCORER_SYSTEM_PROMPT }] },
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.4 },
            }),
            signal: AbortSignal.timeout(30_000),
          },
        );
        if (!res.ok) {
          const err = await res.text().catch(() => "");
          if (res.status === 429 || err.includes("quota")) break;
          continue;
        }
        const json: any = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      } catch {
        // try next model/key
      }
    }
  }
  return null;
}

async function tryGroq(prompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        messages: [
          { role: "system", content: SCORER_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    return json?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

const HEURISTIC_DRAFTS: Record<string, [string, string]> = {
  "web-design": [
    "Hey! I build clean, fast websites for founders and small businesses — happy to share some live examples and a quote. What's your timeline?",
    "I do websites for small businesses daily. If you're looking for ideas, I can send over a few I've built and we can talk scope. Down to chat?",
  ],
  "landing-page": [
    "If you're after a high-converting landing page, that's literally what I do — I can show you examples and what yours could look like. Want to talk?",
    "I build landing pages that convert traffic into customers. Happy to walk you through a few examples and a rough quote if you're interested.",
  ],
  "saas-app": [
    "I build MVPs for founders — quick, clean, and launch-ready. Happy to walk through how I'd approach yours and give you a timeline.",
    "Founders come to me to turn their idea into a working MVP. If you want, I can outline the build steps and what it'd cost.",
  ],
  branding: [
    "I design brands and logos that don't blend in — happy to share recent work and some directions for yours.",
    "If you're looking for a logo or full brand identity, I've got a portfolio of recent designs I can show you. Want to take a look?",
  ],
  "social-media": [
    "I run social media and ads for small businesses — if you need help turning content into customers, I can put together a quick plan for you.",
    "Social media and paid ads are my thing — happy to map out a simple strategy for your business if you're looking for help.",
  ],
  copywriting: [
    "I write sales copy that converts — websites, emails, landing pages. Happy to show you examples and give you a quote.",
    "If you need copy that actually sells, I can share some recent work and talk through what your project would look like.",
  ],
  video: [
    "I edit videos for creators and businesses — YouTube, podcasts, ads. I can show you before/afters if you're looking for an editor.",
    "Video editing is what I do — long-form, ads, podcasts. Happy to send over samples and a quote for your project.",
  ],
  "ai-automation": [
    "I build AI automations that save teams hours a week — happy to map out what yours could look like. Want to talk?",
    "If you're looking to automate repetitive work, I build those systems for businesses. Happy to sketch out a plan for you.",
  ],
  ecommerce: [
    "I build Shopify stores that actually convert — happy to share examples and a quote for yours.",
    "Shopify stores are my specialty. I can show you a few I've built and break down what yours would need. Interested?",
  ],
  systems: [
    "I set up systems — Notion, CRMs, SOPs — that keep teams running without chaos. Happy to walk you through how I'd fix yours.",
    "If your business runs on chaos, I build the systems that fix it — SOPs, CRMs, workflows. Want a quick overview of how I'd help?",
  ],
};

/** Deterministic fallback when no LLM is reachable (missing key or quota).
 *  "other" category scores below the threshold so junk never reaches the queue. */
function heuristicScore(matchedCategory: string, text: string): ScoredPost {
  if (matchedCategory === "other") {
    return { category: "other", intentScore: 45, draftA: "", draftB: "" };
  }
  const lower = text.toLowerCase();
  const strong = [
    "urgent",
    "need",
    "hiring",
    "hire",
    "looking for",
    "looking to",
    "want to build",
    "need a",
    "want a",
    "help me",
    "who can",
    "recommend",
    "quote",
    "budget",
    "can you",
    "anyone",
    "price",
  ];
  const hits = strong.filter((w) => lower.includes(w)).length;
  const score = Math.min(92, 58 + hits * 8);
  const [draftA, draftB] = HEURISTIC_DRAFTS[matchedCategory] || HEURISTIC_DRAFTS["web-design"];
  return { category: matchedCategory, intentScore: score, draftA, draftB };
}

export async function scorePost(
  username: string,
  text: string,
  matchedCategory: string,
): Promise<ScoredPost | null> {
  const prompt = `Threads post by @${username || "unknown"}:\n"""${text.slice(0, 600)}"""\n\nIt was pre-matched to category "${matchedCategory}" — confirm or correct it.`;
  const raw = (await tryGemini(prompt)) || (await tryGroq(prompt));
  if (!raw) return heuristicScore(matchedCategory, text);
  try {
    const parsed = JSON.parse(cleanJson(raw)) as Partial<ScoredPost>;
    const score = Math.max(0, Math.min(100, Number(parsed.intentScore) || 0));
    return {
      category: typeof parsed.category === "string" ? parsed.category : "other",
      intentScore: score,
      draftA: String(parsed.draftA || "").slice(0, 500),
      draftB: String(parsed.draftB || "").slice(0, 500),
    };
  } catch {
    return null;
  }
}
