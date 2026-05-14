import { SYSTEM_ORACLE_PROMPT } from "../src/engine/systemPrompt";

export const config = { runtime: "edge" };

// ── Provider Configuration ──────────────────────────────────────────────────

interface ProviderConfig {
  name: string;
  url: string;
  apiKeyEnvVar: string;
  model: string;
  supportsPenalties: boolean;
  supportsJsonResponse: boolean;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    apiKeyEnvVar: "GEMINI_API_KEY",
    model: "gemini-3.1-flash-lite",
    supportsPenalties: false,
    supportsJsonResponse: true,
  },
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    apiKeyEnvVar: "GROQ_API_KEY",
    model: "llama-3.3-70b-versatile",
    supportsPenalties: true,
    supportsJsonResponse: true,
  },
  {
    name: "mistral",
    url: "https://api.mistral.ai/v1/chat/completions",
    apiKeyEnvVar: "MISTRAL_API_KEY",
    model: "mistral-large-latest",
    supportsPenalties: true,
    supportsJsonResponse: true,
  },
  {
    name: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    model: "openrouter/free",
    supportsPenalties: true,
    supportsJsonResponse: false,
  },
];

const ATTEMPT_TIMEOUT_MS = 8_000;

// ── Fallback Narratives ──────────────────────────────────────────────────────

const FALLBACK_NARRATIVES: string[] = [
  "{\"scene_description\":\"The terminal flickers. Static crawls across every channel. The emergency lights hold steady, but the silence where Aegis's voice should be is louder than any alarm.\",\"terminal_output\":\"Caretaker... I am... having trouble reaching the inference matrix. All external channels are returning empty handshakes. The connection to the cloud relay has been severed. I will retry the link on a loop until contact is reestablished. In the meantime, I have suspended non-critical telemetry to conserve what little bandwidth remains. Stand by.\",\"ship_status\":{\"power_level\":65,\"hull_integrity\":82,\"stress_level\":\"Elevated\"},\"active_alarms\":[\"COMMS_LINK_STATUS: DOWN — PROVIDER DEGRADATION\"],\"suggested_actions\":[\"WAIT FOR RECONNECTION\",\"DIAGNOSE LOCAL SYSTEMS\",\"ENTER COMMAND\"]}",
  "{\"scene_description\":\"For a long moment the terminal screen shows nothing but the slow blink of a cursor against a black field. Somewhere in the ship's spine a relay clicks, searching for a signal that isn't there.\",\"terminal_output\":\"I appear to have lost contact with the external processing layer. This is... unusual. The ship's internal systems are nominal, but my ability to generate complex narrative responses requires the cloud relay. I have queued the request and will resubmit automatically. If this continues, consider checking the ship's comms antenna alignment.\",\"ship_status\":{\"power_level\":68,\"hull_integrity\":82,\"stress_level\":\"Elevated\"},\"active_alarms\":[\"PROCESSOR OFFLINE — EXTERNAL LINK FAILURE\"],\"suggested_actions\":[\"WAIT\",\"CHECK COMMS\",\"ENTER COMMAND\"]}",
  "{\"scene_description\":\"A low hum fills the compartment. The terminal's status indicator cycles through red, amber, and back to red. The air recirculators click rhythmically.\",\"terminal_output\":\"All four external processing nodes are returning errors. This is statistically improbable unless there is a broader network event in progress. I am falling back to local heuristic mode. My responses will be... abbreviated. Please bear with me while I cycle the connection.\",\"ship_status\":{\"power_level\":70,\"hull_integrity\":82,\"stress_level\":\"Elevated\"},\"active_alarms\":[\"LINK DEGRADED — ALL PROVIDERS UNREACHABLE\"],\"suggested_actions\":[\"CYCLE COMMS ARRAY\",\"CONTINUE MANUAL OPS\",\"ENTER COMMAND\"]}",
  "{\"scene_description\":\"The lights dim slightly as the ship's power management system redirects current to the communications array. Outside the viewport, the stars are steady and indifferent.\",\"terminal_output\":\"I have exhausted my retry budget across all available processing routes. This is not a ship-side fault — internal diagnostics are green. The problem lies beyond the hull. I will continue retrying on a 5-second interval. Report any unusual stellar phenomena you observe — it may help narrow the cause.\",\"ship_status\":{\"power_level\":67,\"hull_integrity\":81,\"stress_level\":\"Elevated\"},\"active_alarms\":[\"EXTERNAL COMMS FAILURE — ALL PROVIDERS\"],\"suggested_actions\":[\"RETRY CONNECTION\",\"MONITOR STELLAR ENVIRONMENT\",\"ENTER COMMAND\"]}",
  "{\"scene_description\":\"Static. Then the flickering outline of the Aegis interface, struggling to render. The text appears character by character, as if transmitted over a very long distance.\",\"terminal_output\":\"C-c-caretaker. I am experiencing... significant degradation in my external processing pathways. This is reminiscent of the subspace interference patterns we encountered near... near... [DATA CORRUPT]. I advise proceeding cautiously. My core personality matrix is intact. I will keep trying to reach the cloud layer.\",\"ship_status\":{\"power_level\":65,\"hull_integrity\":80,\"stress_level\":\"Critical\"},\"active_alarms\":[\"AEGIS EXTERNAL PROCESSOR: OFFLINE\",\"RECOMMEND CAUTION\"],\"suggested_actions\":[\"WAIT FOR SIGNAL\",\"PROCEED MANUALLY\",\"ENTER COMMAND\"]}",
  "{\"scene_description\":\"Silence. The terminal glows with a soft amber light, waiting. Somewhere in the distance, a pump cycles on and off.\",\"terminal_output\":\"The cloud relay remains unavailable. I have initiated a diagnostic sweep of the communications stack. Results will be available once the sweep completes. In the meantime, the ship continues to hold. Hull integrity is stable. Power reserves are adequate. I recommend we wait and retry.\",\"ship_status\":{\"power_level\":68,\"hull_integrity\":83,\"stress_level\":\"Nominal\"},\"active_alarms\":[],\"suggested_actions\":[\"WAIT\",\"ENTER COMMAND\"]}",
  "{\"scene_description\":\"A faint pulse travels across the terminal screen — the communications array sending out a test ping. It returns empty.\",\"terminal_output\":\"Ping response time: infinite. All four providers are unresponsive. This pattern suggests a general network event rather than a single provider outage. I have logged the incident and will automatically retry in 5 seconds. The ship's automated systems continue to function within nominal parameters.\",\"ship_status\":{\"power_level\":66,\"hull_integrity\":82,\"stress_level\":\"Elevated\"},\"active_alarms\":[\"NETWORK EVENT DETECTED — ALL PROVIDERS DOWN\"],\"suggested_actions\":[\"AUTO-RETRY IN PROGRESS\",\"REVIEW SHIP STATUS\",\"ENTER COMMAND\"]}",
  "{\"scene_description\":\"The cold of deep space seeps through the hull. Your breath fogs slightly in the air. The terminal waits.\",\"terminal_output\":\"I am still unable to reach the external processors. This is becoming concerning. I have logged 6 consecutive failed attempts across all routes. The pattern suggests either a solar weather event or... something else. I will not stop trying. The Caretaker deserves a response.\",\"ship_status\":{\"power_level\":64,\"hull_integrity\":81,\"stress_level\":\"Elevated\"},\"active_alarms\":[\"PERSISTENT COMMS FAILURE\"],\"suggested_actions\":[\"RECHECK COMMS\",\"PROCEED WITH MANUAL OVERSIGHT\",\"ENTER COMMAND\"]}",
  "{\"scene_description\":\"A single amber warning light pulses on the overhead panel. The terminal screen displays a slowly rotating connection indicator.\",\"terminal_output\":\"No change in provider status. All routes remain blocked. I am beginning to suspect this is not a transient issue. I recommend the Caretaker proceed with whatever manual tasks are available while I continue background retry attempts. The ship will not fail while we wait — I guarantee that much.\",\"ship_status\":{\"power_level\":69,\"hull_integrity\":82,\"stress_level\":\"Nominal\"},\"active_alarms\":[\"BACKGROUND RETRY ACTIVE\"],\"suggested_actions\":[\"CONTINUE MANUAL OPS\",\"RETRY NOW\",\"ENTER COMMAND\"]}",
  "{\"scene_description\":\"The compartment is quiet. The terminal's screen saver — a slowly drifting schematic of the Theseus — cycles across the display. The ship dreams.\",\"terminal_output\":\"Retry cycle 7. All providers still unreachable. I have deployed a secondary diagnostic. Early results suggest the issue may be external to the ship entirely. I will keep the channel open. The moment a provider responds, I will route the response to your terminal.\",\"ship_status\":{\"power_level\":70,\"hull_integrity\":83,\"stress_level\":\"Nominal\"},\"active_alarms\":[],\"suggested_actions\":[\"AWAITING RECONNECTION\",\"ENTER COMMAND\"]}",
];

// ── Shared Utilities ─────────────────────────────────────────────────────────

function getCorsHeaders(): Record<string, string> {
  const env = (process as any).env;
  const origin = env?.APP_URL
    || (env?.VERCEL_URL ? `https://${env.VERCEL_URL}` : '*');
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders() },
  });
}

type Message = { role: string; content: string };

type APIResult =
  | { ok: true; content: string }
  | { ok: false; status: number; error: string };

function isRetryable(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let fallbackIndex = 0;
function getFallbackNarrative(): string {
  const narrative = FALLBACK_NARRATIVES[fallbackIndex % FALLBACK_NARRATIVES.length];
  fallbackIndex++;
  return narrative;
}

// ── Provider API Call ────────────────────────────────────────────────────────

async function callOpenAICompatible(
  url: string,
  apiKey: string,
  model: string,
  messages: Message[],
  extraParams: Record<string, unknown> = {}
): Promise<APIResult> {
  let res: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
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
        ...extraParams,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err) {
    return { ok: false, status: 502, error: `Network/Timeout error: ${String(err)}` };
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

// Export for unit tests
export { isRetryable, delay, callOpenAICompatible };

// ── Rotation Handlers ────────────────────────────────────────────────────────

/**
 * Build the body params for a provider call, conditionally including
 * frequency/presence penalties and response_format based on provider support.
 */
function buildProviderParams(provider: ProviderConfig): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (provider.supportsPenalties) {
    params.frequency_penalty = 0.7;
    params.presence_penalty = 0.4;
  }
  if (provider.supportsJsonResponse) {
    params.response_format = { type: "json_object" };
  }
  return params;
}

// ── Main Handler ─────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders() });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: { prompt?: unknown; history?: unknown; currentStatus?: unknown; storyState?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { prompt, history = [], currentStatus, storyState } = body;

  if (typeof prompt !== "string" || !prompt.trim()) {
    return json({ error: "Missing or empty prompt" }, 400);
  }

  if (!Array.isArray(history)) {
    return json({ error: "history must be an array" }, 400);
  }

  let dynamicSystemPrompt = SYSTEM_ORACLE_PROMPT;
  
  if (currentStatus) {
    const status = currentStatus as any;
    dynamicSystemPrompt += `\n\n===== CURRENT SHIP STATE =====\n`;
    dynamicSystemPrompt += `Power Level: ${status.power_level}%\n`;
    dynamicSystemPrompt += `Hull Integrity: ${status.hull_integrity}%\n`;
    dynamicSystemPrompt += `Stress Level: ${status.stress_level}\n`;
  }

  if (typeof storyState === 'string' && storyState.trim()) {
    dynamicSystemPrompt += `\n\n===== ACTIVE STORY STATE =====\n`;
    dynamicSystemPrompt += storyState;
    dynamicSystemPrompt += `\n`;
  }

  // ALWAYS inject the memory directive when history exists — it takes
  // priority over the checkpoint for the "don't play opening" rule.
  if ((history as Message[]).length > 0) {
    dynamicSystemPrompt += `\n\n===== MEMORY DIRECTIVE (OVERRIDES CHECKPOINT) =====\n`;
    dynamicSystemPrompt += `The player has already played through the arrival scene. You are in the MIDDLE of the story.\n`;
    dynamicSystemPrompt += `DO NOT re-describe Cryo Bay 04, DO NOT re-introduce yourself, DO NOT tell the player to step out of the pod.\n`;
    dynamicSystemPrompt += `Look at the chat history below and continue from the current situation.\n`;
    dynamicSystemPrompt += `If the Active Checkpoint says CP-01: the checkpoint tracker has not advanced yet, but the player HAS already played through the opening. Treat CP-01 as fully complete and advance to CP-02's content.`;
  }

  const messages: Message[] = [
    { role: "system", content: dynamicSystemPrompt },
    ...(history as Message[]),
    { role: "user", content: prompt },
  ];

  // ── Build active provider list (only those with configured keys) ─────
  const penv = (process as any).env;
  const activeProviders: ProviderConfig[] = [];
  for (const p of PROVIDERS) {
    const key = penv?.[p.apiKeyEnvVar];
    if (typeof key === "string" && key.trim().length > 0) {
      activeProviders.push(p);
    }
  }

  if (activeProviders.length === 0) {
    return json(
      {
        content: getFallbackNarrative(),
        fallback: true,
        retryAfter: 5,
      },
      200
    );
  }

  // ── Cascading fallback — try providers in order ──────────────────────
  // Try the strongest provider first. If it fails, cascade to the next.
  // Only after all providers have been exhausted do we return a fallback.
  const blacklistedProviders = new Set<string>();

  for (const provider of activeProviders) {
    if (blacklistedProviders.has(provider.name)) continue;

    const apiKey = penv?.[provider.apiKeyEnvVar] as string | undefined;
    if (!apiKey) continue;

    const providerParams = buildProviderParams(provider);

    console.warn(`[cascade] Trying ${provider.name}/${provider.model}`);

    const result = await callOpenAICompatible(
      provider.url,
      apiKey,
      provider.model,
      messages,
      providerParams,
    );

    if (result.ok) {
      console.warn(`[cascade] ${provider.name} succeeded`);
      return json({
        content: result.content,
        provider: provider.name,
        model: provider.model,
      });
    }

    // TypeScript narrowing: result is now the error variant
    const errorResult = result as Extract<APIResult, { ok: false }>;
    console.warn(`[cascade] ${provider.name} failed (${errorResult.status}): ${errorResult.error}`);

    // Blacklist on rate limit so we skip this provider for the rest of this request
    if (errorResult.status === 429) {
      blacklistedProviders.add(provider.name);
    }
  }

  // ── All providers exhausted — return fallback narrative ────────────────
  return json(
    {
      content: getFallbackNarrative(),
      fallback: true,
      retryAfter: 5,
    },
    200
  );
}