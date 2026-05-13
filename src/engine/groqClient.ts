import type { ChatHistoryMessage } from "../hooks/useCaretakerAI";
import { parseAIResponse, type ParsedAIResponse } from "./responseParser";

export async function sendGroqMessage(
  prompt: string,
  history: ChatHistoryMessage[],
  cloudModel: string,
): Promise<ParsedAIResponse> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, history, cloudModel }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const errorMessage = body.error || `Groq request failed: ${response.status}`;
    if (body.provider !== undefined || body.suggestion) {
      const parts = [errorMessage];
      if (body.suggestion) {
        parts.push(body.suggestion);
      }
      throw new Error(parts.join(" "));
    }
    throw new Error(errorMessage);
  }

  const { content } = await response.json();
  return parseAIResponse(content);
}
