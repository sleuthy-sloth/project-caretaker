import { SYSTEM_ORACLE_PROMPT } from "../src/engine/systemPrompt";

export const config = { runtime: "edge" };

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

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

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = (process as any).env?.GROQ_API_KEY;
  if (!apiKey) {
    return json({ error: "GROQ_API_KEY is not configured on the server." }, 500);
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

  const messages = [
    { role: "system", content: SYSTEM_ORACLE_PROMPT },
    ...history,
    { role: "user", content: prompt },
  ];

  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.85,
        max_tokens: 1024,
        frequency_penalty: 0.7,
        presence_penalty: 0.4,
      }),
    });
  } catch (err) {
    return json({ error: `Failed to reach Groq: ${String(err)}` }, 502);
  }

  const groqData = await groqRes.json();

  if (!groqRes.ok) {
    const msg = groqData?.error?.message || `Groq API error ${groqRes.status}`;
    return json({ error: msg }, groqRes.status);
  }

  const content: string = groqData.choices?.[0]?.message?.content ?? "";
  return json({ content });
}
