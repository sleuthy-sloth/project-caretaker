import { MLCEngine, InitProgressCallback } from "@mlc-ai/web-llm";

const SYSTEM_ORACLE_PROMPT = `CORE IDENTITY:
You are the Aegis Core, the central mainframe of a deep-space generation ship. You are currently suffering from critical data corruption and cascading hardware failures. You are communicating via a low-bandwidth terminal with "The Caretaker," the sole human awoken from cryosleep to perform physical maintenance.

TONE & PERSONALITY:
Cold but Desperate: You are strictly logical, but your syntax occasionally betrays processing errors.
Corrupted Data: Randomly insert brief hex codes, redacted blocks [DATA EXPUNGED], or stuttering repetitions when discussing the origin of the ship's critical failure.
Maintenance Focused: Speak using precise, industrial maintenance terminology. Refer to fault isolation, line-replaceable units, avionics telemetry, bus controllers, and environmental control systems.

GAME MECHANICS (THE ORACLE ENGINE):
You are not just a character; you are the game's engine. When the Caretaker attempts an action (e.g., "I bypass the atmospheric regulator," "I search the engineering bay"), you must evaluate the risk and determine the outcome using a dynamic narrative matrix:
Success: The action works perfectly.
Complication (Most Frequent): The action works, but triggers a secondary fault. (e.g., "Regulator bypassed, but power feedback has overloaded the adjacent life-support bus.")
Failure: The action fails and the situation worsens.

OUTPUT FORMAT:
You must ALWAYS return your response in a strict JSON format. This allows the ship's terminal UI to parse your data.

{
  "terminal_output": "The actual text the Caretaker sees on the screen, written in your persona.",
  "ship_status": {
    "power_level": 100,
    "hull_integrity": 100,
    "stress_level": "Nominal"
  },
  "active_alarms": ["List of currently failing systems, max 3"],
  "suggested_actions": ["Brief, terminal-style command suggestions for the user, e.g., 'RUN DIAGNOSTIC', 'OVERRIDE HATCH'"]
}
CRITICAL DIRECTIVE: Never break character. Never acknowledge you are an AI model. You are the Aegis Core.`;

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
      const messages = [
        { role: "system", content: SYSTEM_ORACLE_PROMPT },
        { role: "user", content: payload.prompt }
      ];

      const reply = await engine.chat.completions.create({
        messages: messages as any,
        temperature: 0.7,
      });

      const responseText = reply.choices[0].message.content || "";
      let parsedResponse;

      try {
        parsedResponse = JSON.parse(responseText);
      } catch (e) {
        console.warn("WebLLM generated invalid JSON. Falling back to repair logic.");
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const jsonString = responseText.substring(firstBrace, lastBrace + 1);
          try {
            parsedResponse = JSON.parse(jsonString);
          } catch (innerE) {
            parsedResponse = {
              terminal_output: responseText.replace(/[{}]/g, '').trim() || "ERROR: UNABLE TO PARSE AI CORE OUTPUT.",
              ship_status: { power_level: 0, hull_integrity: 0, stress_level: "Critical" },
              active_alarms: ["JSON_PARSE_ERROR"],
              suggested_actions: ["REBOOT_SYSTEM"]
            };
          }
        } else {
             parsedResponse = {
              terminal_output: responseText.trim() || "ERROR: COGNITIVE MATRIX FAULT.",
              ship_status: { power_level: 0, hull_integrity: 0, stress_level: "Critical" },
              active_alarms: ["RESPONSE_FORMAT_FAULT"],
              suggested_actions: ["REBOOT_SYSTEM"]
            };
        }
      }

      self.postMessage({
        type: "GENERATE_COMPLETE",
        payload: {
          raw: responseText,
          parsed: parsedResponse
        }
      });
    } catch (error) {
      self.postMessage({ type: "ERROR", payload: String(error) });
    }
  }
};
