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
    throw new Error(body.error || `Groq request failed: ${response.status}`);
  }

  const { content } = await response.json();
  return parseAIResponse(content);
}
