import { VIRALEO_SYSTEM_PROMPT, VIRALEO_WRITER_APPEND } from "@/lib/ai/viraleo-voice";

interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export type LLMQuality = "fast" | "quality";

const FAST_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
const QUALITY_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  }
  return cleaned;
}

async function tryGemini(
  keys: string[],
  modelNames: string[],
  userPrompt: string,
  _imageParts: ImagePart[],
  temperature: number
): Promise<string | null> {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    for (const modelName of modelNames) {
      try {
        const body = JSON.stringify({
          systemInstruction: {
            parts: [{ text: VIRALEO_SYSTEM_PROMPT }],
          },
          contents: [
            {
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: { temperature },
        });

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          }
        );

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.warn(`Gemini ${modelName} failed (key ${i}): ${res.status} ${errText.slice(0, 200)}`);
          if (res.status === 429 || errText.includes("quota")) break;
          continue;
        }

        const json: any = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          console.log(`LLM ok: ${modelName} (key ${i})`);
          return text;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`Gemini ${modelName} failed (key ${i}):`, msg);
        if (msg.includes("429") || msg.includes("quota")) break;
      }
    }
  }
  return null;
}

async function tryGroq(userPrompt: string, imageParts: ImagePart[]): Promise<string | null> {
  const groqApiKey = process.env.GROQ_API_KEY || "";
  if (!groqApiKey) return null;

  try {
    let textPrompt = userPrompt;
    if (imageParts.length > 0) {
      textPrompt +=
        "\n\n(Images were provided but Groq is text-only — use metadata and transcript blocks only.)";
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.35,
        messages: [
          { role: "system", content: VIRALEO_SYSTEM_PROMPT },
          { role: "user", content: textPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.warn("Groq error:", await res.text());
      return null;
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch (e: unknown) {
    console.warn("Groq failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function generateLLMContent(
  prompt: string,
  imageParts: ImagePart[] = [],
  quality: LLMQuality = "fast"
): Promise<string> {
  const keysStr = process.env.GEMINI_KEYS || "";
  const keys = keysStr
    .split(",")
    .map((k) => k.trim().replace(/['"]/g, ""))
    .filter(Boolean);

  const models = quality === "quality" ? QUALITY_MODELS : FAST_MODELS;
  const temperature = quality === "quality" ? 0.28 : 0.42;

  const gemini = await tryGemini(keys, models, prompt, imageParts, temperature);
  if (gemini) return gemini;

  const groq = await tryGroq(prompt, imageParts);
  if (groq) return groq;

  throw new Error("All AI generation attempts failed");
}

/** JSON tasks with Viraleo voice + slightly lower temperature on quality tier. */
export async function generateLLMJson(
  userPrompt: string,
  options: { imageParts?: ImagePart[]; quality?: LLMQuality } = {}
): Promise<string> {
  const full = `${userPrompt.trim()}\n\n${VIRALEO_WRITER_APPEND}\n\nReturn ONLY valid JSON. No markdown.`;
  return generateLLMContent(full, options.imageParts || [], options.quality ?? "fast");
}

export function parseLLMJson<T>(text: string): T {
  return JSON.parse(cleanJsonResponse(text)) as T;
}
