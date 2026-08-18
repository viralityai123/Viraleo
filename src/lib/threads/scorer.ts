import { THREADS_CATEGORIES } from "./taxonomy";
import { THREADS_CONFIG } from "./config";

/**
 * Scores a candidate post with an LLM: buying-intent score, category,
 * and two reply drafts in a casual, value-first voice (no links, no spam).
 */

const CREDENTIALS = (() => {
  const parts: string[] = [];
  if (THREADS_CONFIG.portfolioSites.length > 0) {
    parts.push(`- Websites you personally designed and built: ${THREADS_CONFIG.portfolioSites.join(", ")}`);
  }
  if (THREADS_CONFIG.portfolioUrlVideo) {
    parts.push(`- SaaS video demos of products you built: ${THREADS_CONFIG.portfolioUrlVideo}`);
  }
  if (THREADS_CONFIG.portfolioUrl) {
    parts.push(`- Portfolio: ${THREADS_CONFIG.portfolioUrl}`);
  }
  if (THREADS_CONFIG.leadServiceUrl) {
    parts.push(`- A live 24/7 system you built that hunts Threads + Reddit and finds 30+ fresh design/web leads daily (your own tool — see ${THREADS_CONFIG.leadServiceUrl})`);
  }
  return parts.length > 0 ? `\nYOUR CREDENTIALS (real work you built — name it in ONE draft when it fits naturally):\n${parts.join("\n")}` : "";
})();

const SAME_DAY_OFFERS = `\nDRAFT-C RULES (the close-booking draft — only for hot leads):\n- Web/design/branding/landing leads: use the MEETING PITCH verbatim — "${THREADS_CONFIG.sameDayOffer}" — adapt only the meeting time if their post signals a different availability. NEVER mention prices, budgets, or payments in draftC.\n- Video editing leads: "${THREADS_CONFIG.sameDayOfferVideo}"\n- Designers/agencies needing clients (lead-service): "${THREADS_CONFIG.leadServiceOffer}" — sell the lead feed, not design work.`;

const SCORER_SYSTEM_PROMPT = `You are a sharp sales lead analyst for Viraleo, a design studio that helps founders, creators, and small businesses launch websites, landing pages, SaaS products, and brands.${CREDENTIALS ? `\n\nIMPORTANT — REAL WORK YOU BUILT (use these EXACT names/links when instructed below):\n${CREDENTIALS.trim()}` : ""}

Your job: read a social post and decide if the author is a POTENTIAL BUYER looking for a service, then score their buying intent.

Scoring rules:
- 90-100: clearly asking for a service / hiring / wants to buy now ("need a website", "hiring a designer", "who can build my app")
- 70-89: strongly implies a need ("launching my SaaS soon", "starting my dropshipping store", "my landing page converts terribly")
- 50-69: possible need, vague ("any advice on tools?", "thinking about rebranding")
- 0-49: not a buyer (designer promoting themselves, general discussion, joke, news, spam)

SPECIAL CASE — the "lead-service" category: posts where the AUTHOR is a freelancer, designer, or agency SEEKING MORE CLIENTS ("need clients", "freelance is dry", "looking for clients/work", "grow my agency"). These people are BUYERS OF YOUR LEAD-FEED SYSTEM — not of design work. Score 85+ when the need for clients is explicit, 60-84 when implied. NEVER score them 0-49 just because they aren't hiring a designer — a dry freelancer is a hot lead for your system.

Category: pick the single best match from this list (use the exact id): ${THREADS_CATEGORIES.map((c) => `${c.id} (${c.label})`).join(", ")}. If none fit, use "other".

Reply drafts (two variants, draftA and draftB):
- 1-2 sentences each. Natural, specific, consultative — like a sharp freelance designer who actually read their post. NO brag-bait, NO "I've built 10+ X", NO "DM me", NO emoji spam (max one subtle emoji).
- draftA: OPEN with a SPECIFIC, concrete observation about THEIR post (quote their words or the exact task they described), then ask ONE tight question that moves them toward a decision ("What's your budget?", "When do you need it live?", "Who's the site for — is this your main business site?").
- draftB: MUST reference your real work from the IMPORTANT block above, naming a project literally — one of the exact site names (e.g. "viblo.ai is one I built", "I built viblo.ai and viewmax.io") OR, when a demo-video link is listed, referencing the demo videos ("I've got demo videos of products I've built"). Use the literal names/links as given — do not paraphrase them away. For lead-service posts, draftB references the 24/7 lead-hunting system you built and offers a FREE 3-LEAD SAMPLE.
- You are an individual freelancer. NEVER write "we", "our agency", "At Viraleo", or any agency-brand claim. Always "I".
- Offer a zero-pressure next step: a free 5-minute audit, a quick recommendation, or a rough estimate — phrased like you do this daily.
- Never include raw links/prices in drafts unless a credential URL is present (then it may appear in draftB).
- Urgency works: "I can start today / first draft within 24h" ONLY when their post signals an immediate need (urgent, deadline, launch date).
- draftC (ONLY when intentScore >= 85 or their post is a clear job/hire request): the close-booking pitch from the DRAFT-C RULES block, adapted to THEIR project. For web/design/landing leads this is the 5 PM meeting pitch — NO prices, NO budgets, NO payments in text; the quote happens on the call. For every other lead, return draftC as an EMPTY string.
- If the post is NOT a buyer, drafts can be short generic "good luck" style lines (they won't be used anyway).

Return ONLY valid JSON: {"category":"...","intentScore":0-100,"draftA":"...","draftB":"...","draftC":"...","reasoning":"one short line"} (draftC empty unless the lead is clearly hot).`;

export interface ScoredPost {
  category: string;
  intentScore: number;
  draftA: string;
  draftB: string;
  draftC?: string;
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
  "ui-ux": [
    "You mentioned needing UI/UX work — what's the core flow your users keep getting stuck on? Happy to sketch a quick recommendation (and send my portfolio over) once I know.",
    "For a project like yours the first thing I'd map is the screens and the user flow. Do you have a rough idea of the feature set yet? Happy to walk through it with you.",
  ],
  "web-design": [
    "What's the site for — your main business site or a new product? If you tell me the goal and who it serves, I'll send over a couple of options that fit it (plus my portfolio).",
    "You mentioned needing a website — roughly when do you want it live? I can start as soon as this week and have a first draft for you within days.",
  ],
  "landing-page": [
    "What's the landing page converting to — signups, demo calls, sales? Tell me the one action and I'll send a recommendation for the structure (and my portfolio).",
    "For a page like this, the headline and the CTA do most of the work. Who's the traffic coming from — ads, organic, cold outreach? Happy to give you a quick take.",
  ],
  "saas-app": [
    "Is this an MVP to validate, or a build you're fully committed to? That changes how I'd approach it — happy to map out the first version with you.",
    "What's the core job your app does in one sentence? If you give me that, I'll outline the screens and what the first build looks like.",
  ],
  branding: [
    "What's the vibe you want — is this a refresh or a completely new identity? If you share a competitor whose look you like, I can send some directions (and my portfolio).",
    "For your logo, what matters more: standing out on a shelf or fitting a clean corporate look? Happy to show you both directions.",
  ],
  "social-media": [
    "What's the main goal with your socials — leads, brand awareness, or sales? Tell me that and I'll put together a simple 2-week plan for you.",
    "Are you running any ads right now, or is this all organic? That changes the strategy — happy to give you a quick recommendation either way.",
  ],
  copywriting: [
    "What's the copy for — a website, emails, or an ad? If you tell me the page and who reads it, I'll send a quick rewrite of the first section as a sample.",
    "Where are you losing people right now — visitors leave before buying, or emails don't convert? Happy to take a look and give you a specific fix.",
  ],
  video: [
    "What type of content is this — YouTube, ads, or client work? If you share a rough cut or a reference, I'll tell you exactly how I'd edit it (and send samples).",
    "What's your turnaround — are these weekly videos or a one-off project? I can tell you how I'd structure it and give you a quote.",
  ],
  "ai-automation": [
    "What's the task you're most tired of doing manually? If you describe that one process, I'll tell you exactly how I'd automate it.",
    "Is this for one workflow or several? List the top two time-sinks and I'll map out what the automation looks like.",
  ],
  ecommerce: [
    "What platform are you on, or are you starting from zero? If you tell me the products, I'll send over a plan for the store (and my portfolio).",
    "What's the main bottleneck — traffic, conversion, or setup? Happy to look at the store and give you a specific fix.",
  ],
  systems: [
    "Which process wastes the most time right now — client onboarding, project tracking, or follow-ups? I'd start there — happy to show you how I'd fix it.",
    "Are you using Notion, Airtable, or a CRM already? Tell me what you've got and I'll tell you what to keep and what to change.",
  ],
  "lead-service": [
    "Finding clients is the grind, right? I built a system that finds 30+ fresh design leads daily on Threads and Reddit — happy to send you a free 3-lead sample and you judge for yourself.",
    "What's your client drought costing you right now — empty weeks or last-minute panic projects? I've got a system that pulls fresh design leads daily; I can start your free sample today.",
  ],
};

function heuristicDraftC(category: string, score: number): string {
  if (score < 85) return "";
  if (category === "video") return THREADS_CONFIG.sameDayOfferVideo;
  if (category === "lead-service") return THREADS_CONFIG.leadServiceOffer;
  return THREADS_CONFIG.sameDayOffer;
}

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
  return {
    category: matchedCategory,
    intentScore: score,
    draftA,
    draftB,
    draftC: heuristicDraftC(matchedCategory, score),
  };
}

export async function scorePost(
  username: string,
  text: string,
  matchedCategory: string,
): Promise<ScoredPost | null> {
  const prompt = `Social post by @${username || "unknown"}:\n"""${text.slice(0, 600)}"""\n\nIt was pre-matched to category "${matchedCategory}" — confirm or correct it.`;
  const raw = (await tryGemini(prompt)) || (await tryGroq(prompt));
  if (!raw) return heuristicScore(matchedCategory, text);
  try {
    const parsed = JSON.parse(cleanJson(raw)) as Partial<ScoredPost>;
    const score = Math.max(0, Math.min(100, Number(parsed.intentScore) || 0));
    const draftC = String(parsed.draftC || "").trim().slice(0, 500);
    return {
      category: typeof parsed.category === "string" ? parsed.category : "other",
      intentScore: score,
      draftA: String(parsed.draftA || "").slice(0, 500),
      draftB: String(parsed.draftB || "").slice(0, 500),
      draftC: score >= 85 && draftC.length > 10 ? draftC : "",
    };
  } catch {
    return null;
  }
}
