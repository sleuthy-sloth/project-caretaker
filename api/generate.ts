import { SYSTEM_ORACLE_PROMPT } from "../src/engine/systemPrompt";

export const config = { runtime: "edge" };

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openrouter/free"; // routes to whichever free model is live

// Uses Google's OpenAI-compatible endpoint
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
// Tried in order; each cascades to the next on 429/503.
// 3.1 Flash Lite has the highest RPM (15), so it goes first.
const GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash",
  "gemini-2.5-flash",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

type Message = { role: string; content: string };

type APIResult =
  | { ok: true; content: string }
  | { ok: false; status: number; error: string };

async function callOpenAICompatible(
  url: string,
  apiKey: string,
  model: string,
  messages: Message[],
  extraParams: Record<string, unknown> = {}
): Promise<APIResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.85,
        max_tokens: 1024,
        response_format: { type: "json_object" },
        ...extraParams,
      }),
    });
  } catch (err) {
    return { ok: false, status: 502, error: `Network error: ${String(err)}` };
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    let msg = `API error ${res.status}`;
    if (data !== null) {
      const errField = (data as any)?.error;
      if (typeof errField === "string" && errField) {
        msg = errField;
      } else if (errField?.message) {
        msg = String(errField.message);
      } else {
        try { msg = JSON.stringify(data); } catch { /* keep default */ }
      }
    }
    return { ok: false, status: res.status, error: msg };
  }

  const content: string = (data as any).choices?.[0]?.message?.content ?? "";
  return { ok: true, content };
}

function isRetryable(status: number): boolean {
  return status === 429 || status === 503;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: { prompt?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { prompt, history = [] } = body;

  if (typeof prompt !== "string" || !prompt.trim()) {
    return json({ error: "Missing or empty prompt" }, 400);
  }

  if (!Array.isArray(history)) {
    return json({ error: "history must be an array" }, 400);
  }

  const messages: Message[] = [
    { role: "system", content: SYSTEM_ORACLE_PROMPT },
    ...(history as Message[]),
    { role: "user", content: prompt },
  ];

  const penv = (process as any).env;

  // frequency_penalty / presence_penalty are supported by Groq and OpenRouter
  // but are rejected by Gemini's OpenAI-compatible endpoint.
  const penaltyParams = { frequency_penalty: 0.7, presence_penalty: 0.4 };

  // 1. Try Groq
  const groqKey: string | undefined = penv?.GROQ_API_KEY;
  if (groqKey) {
    const result = await callOpenAICompatible(GROQ_API_URL, groqKey, GROQ_MODEL, messages, penaltyParams);
    if (result.ok) return json({ content: result.content });
    console.warn(`Groq failed (${result.status}): ${result.error}. Falling back...`);
  }

  // 2. Groq rate-limited/unavailable (or unconfigured) → try Gemini models in order
  const geminiKey: string | undefined = penv?.GEMINI_API_KEY;
  if (geminiKey) {
    // Gemini does not accept frequency_penalty / presence_penalty — omit them
    for (const model of GEMINI_MODELS) {
      const result = await callOpenAICompatible(GEMINI_API_URL, geminiKey, model, messages);
      if (result.ok) return json({ content: result.content });
      console.warn(`Gemini model ${model} failed (${result.status}): ${result.error}. Trying next...`);
    }
  }

  // 3. Gemini rate-limited (or unconfigured) → try OpenRouter (auto-routes to live free models)
  const openrouterKey: string | undefined = penv?.OPENROUTER_API_KEY;
  if (openrouterKey) {
    const result = await callOpenAICompatible(OPENROUTER_API_URL, openrouterKey, OPENROUTER_MODEL, messages, penaltyParams);
    if (result.ok) return json({ content: result.content });
    console.warn(`OpenRouter failed (${result.status}): ${result.error}. No more providers.`);
    return json({ error: result.error }, result.status);
  }

  return json(
    { error: "All AI providers are unavailable. Configure GROQ_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY." },
    503
  );
}
