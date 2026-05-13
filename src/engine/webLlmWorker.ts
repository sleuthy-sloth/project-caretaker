import { MLCEngine, InitProgressCallback } from "@mlc-ai/web-llm";
import { SYSTEM_ORACLE_PROMPT } from "./systemPrompt";
import { parseAIResponse } from "./responseParser";

let engine: MLCEngine;

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
      await engine.reload(payload.modelId);
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
