import { MLCEngine, InitProgressCallback, prebuiltAppConfig } from "@mlc-ai/web-llm";
import { SYSTEM_ORACLE_PROMPT } from "./systemPrompt";
import { parseAIResponse } from "./responseParser";

let engine: MLCEngine;

// Safari/iOS workers stall when WebLLM tries to write large model shards to
// IndexedDB — the cache write blocks the fetch pipeline and progress freezes
// at "fetching params". Disabling the cache forces a direct streaming download
// which works correctly on iOS Safari.
function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test((self as unknown as { navigator: Navigator }).navigator?.userAgent ?? "");
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === "INIT") {
    try {
      engine = new MLCEngine();

      const initProgressCallback: InitProgressCallback = (initProgress) => {
        self.postMessage({
          type: "PROGRESS",
          payload: {
            progress: initProgress.progress,
            text: initProgress.text,
          },
        });
      };

      engine.setInitProgressCallback(initProgressCallback);

      const appConfig = isIOS()
        ? { ...prebuiltAppConfig, useIndexedDBCache: false }
        : prebuiltAppConfig;

      await engine.reload(payload.modelId, undefined, appConfig);
      self.postMessage({ type: "INIT_COMPLETE" });
    } catch (error) {
      self.postMessage({ type: "ERROR", payload: String(error) });
    }
  } else if (type === "GENERATE") {
    try {
      const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(payload.history)
        ? payload.history
        : [];

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
