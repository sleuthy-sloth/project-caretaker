import type { ChatHistoryMessage } from "../hooks/useCaretakerAI";
import { parseAIResponse, type ParsedAIResponse } from "./responseParser";

export async function sendGroqMessage(
  prompt: string,
  history: ChatHistoryMessage[],
  retryAttempt: number = 0,
  currentStatus?: ParsedAIResponse['ship_status'],
  storyState?: string
): Promise<ParsedAIResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (retryAttempt > 0) {
    headers["X-Retry-Attempt"] = String(retryAttempt);
  }
  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt, history, currentStatus, storyState }),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Unable to reach the Oracle relay (/api/generate). ${detail}. If you're running locally, start the app with \`vercel dev\` so the API route is available.`
    );
  }

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

  const { content, provider, model } = await response.json();
  const parsed = parseAIResponse(content, currentStatus);
  return { ...parsed, provider, model };
}
