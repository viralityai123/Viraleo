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

export async function scorePost(
  username: string,
  text: string,
  matchedCategory: string,
): Promise<ScoredPost | null> {
  const prompt = `Threads post by @${username || "unknown"}:\n"""${text.slice(0, 600)}"""\n\nIt was pre-matched to category "${matchedCategory}" — confirm or correct it.`;
  const raw = (await tryGemini(prompt)) || (await tryGroq(prompt));
  if (!raw) return null;
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
