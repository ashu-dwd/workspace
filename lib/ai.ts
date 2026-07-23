const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/free";
const HTTP_REFERER = "https://workspace.app";

interface Message {
  role: string;
  content: string;
}

/**
 * Core function that calls OpenRouter API.
 * Supports both streaming and non-streaming modes.
 * Pass an AbortSignal to cancel in-flight requests.
 */
export async function callOpenRouter(params: {
  apiKey: string;
  messages: Message[];
  stream?: boolean;
  signal?: AbortSignal;
}): Promise<Response> {
  const { apiKey, messages, stream = false, signal } = params;

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": HTTP_REFERER,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream,
    }),
    signal,
  });

  return response;
}

/**
 * Non-streaming call. Returns the full text response.
 * Throws on non-OK responses or parse failures.
 */
export async function callOpenRouterNonStreaming(
  apiKey: string,
  messages: Message[]
): Promise<string> {
  const response = await callOpenRouter({ apiKey, messages, stream: false });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter API error: ${response.status} ${response.statusText}${
        body ? ` — ${body}` : ""
      }`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenRouter returned an unexpected response format");
  }

  return content;
}
