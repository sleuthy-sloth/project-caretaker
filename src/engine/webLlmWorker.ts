import { MLCEngine, InitProgressCallback, prebuiltAppConfig } from "@mlc-ai/web-llm";
import { SYSTEM_ORACLE_PROMPT } from "./systemPrompt";
import { parseAIResponse } from "./responseParser";

let engine: MLCEngine;
let activeModelId = "";

// Safari/iOS workers stall when WebLLM tries to write large model shards to
// IndexedDB — the cache write blocks the fetch pipeline and progress freezes
// at "fetching params". Disabling the cache forces a direct streaming download
// which works correctly on iOS Safari.
function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test((self as unknown as { navigator: Navigator }).navigator?.userAgent ?? "");
}

// Trim conversation history so the full prompt fits within the model's context
// window. Keeps the most-recent messages and drops older ones as needed.
// Heuristic: 4 chars ≈ 1 token; 20 chars of overhead per message for role tags.
function trimHistory(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userPrompt: string,
  contextWindow: number,
): Array<{ role: "user" | "assistant"; content: string }> {
  const GENERATION_RESERVE = 1024; // must match max_tokens in the generate call
  const CHARS_PER_TOKEN = 4;
  const MSG_OVERHEAD = 20;

  let budgetChars =
    (contextWindow - GENERATION_RESERVE) * CHARS_PER_TOKEN
    - SYSTEM_ORACLE_PROMPT.length
    - userPrompt.length
    - MSG_OVERHEAD;

  if (budgetChars <= 0) return [];

  const out: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const msgChars = history[i].content.length + MSG_OVERHEAD;
    if (budgetChars < msgChars) break;
    budgetChars -= msgChars;
    out.unshift(history[i]);
  }
  return out;
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === "INIT") {
    try {
      const appConfig = isIOS()
        ? { ...prebuiltAppConfig, useIndexedDBCache: false }
        : prebuiltAppConfig;

      engine = new MLCEngine({ appConfig });
      activeModelId = payload.modelId;

      let lastProgressAt = Date.now();

      const initProgressCallback: InitProgressCallback = (initProgress) => {
        lastProgressAt = Date.now();
        self.postMessage({
          type: "PROGRESS",
          payload: {
            progress: initProgress.progress,
            text: initProgress.text,
          },
        });
      };

      engine.setInitProgressCallback(initProgressCallback);

      // If no progress fires for 90 s the download has stalled (common on
      // mobile due to memory pressure or CDN throttling). Send an error so
      // the UI shows a clear message rather than an infinite spinner.
      const stallTimer = setInterval(() => {
        if (Date.now() - lastProgressAt > 90_000) {
          clearInterval(stallTimer);
          self.postMessage({
            type: "ERROR",
            payload: "Model download stalled — no progress for 90 s. This usually means your device ran out of memory or the network timed out. Try Cloud AI instead, or use a stable Wi-Fi connection on desktop.",
          });
        }
      }, 5_000);

      // system prompt alone is ~4500 tokens. 4096 will crash them.
      const chatOpts = { context_window_size: 8192 };

      await engine.reload(payload.modelId, chatOpts);
      clearInterval(stallTimer);
      self.postMessage({ type: "INIT_COMPLETE" });
    } catch (error) {
      self.postMessage({ type: "ERROR", payload: String(error) });
    }
  } else if (type === "GENERATE") {
    try {
      const rawHistory: Array<{ role: "user" | "assistant"; content: string }> =
        Array.isArray(payload.history) ? payload.history : [];

      const ctxSize = 8192;
      const history = trimHistory(rawHistory, payload.prompt, ctxSize);

      const messages = [
        { role: "system", content: SYSTEM_ORACLE_PROMPT },
        ...history,
        { role: "user", content: payload.prompt },
      ];

      const reply = await engine.chat.completions.create({
        messages: messages as any,
        temperature: 0.85,
        max_tokens: 1024,
        frequency_penalty: 0.7,
        presence_penalty: 0.4,
        response_format: { type: "json_object" },
      });

      const responseText = reply.choices[0].message.content || "";
      const parsedResponse = parseAIResponse(responseText);

      self.postMessage({
        type: "GENERATE_COMPLETE",
        payload: {
          raw: responseText,
          parsed: parsedResponse,
        },
      });
    } catch (error) {
      self.postMessage({ type: "ERROR", payload: String(error) });
    }
  }
};
