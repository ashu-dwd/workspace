import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

// ─── Auth helpers ────────────────────────────────────────────────────────────

function getUserId(request: NextRequest): number | null {
  const token = request.cookies.get("accessToken")?.value;
  if (!token) return null;
  try {
    const decoded = verifyToken(token);
    return decoded.user.id;
  } catch {
    return null;
  }
}

function getApiKey(request: NextRequest): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

// ─── POST /api/ai/complete — SSE streaming ─────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const apiKey = getApiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        { message: "API key is required in Authorization header" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const context: string | undefined = body.context;

    if (!context || typeof context !== "string") {
      return NextResponse.json(
        { message: "context is required and must be a string" },
        { status: 400 }
      );
    }

    const systemPrompt =
      "Complete the user's text naturally. Return only the completion as it appears in the text, no explanations. Keep the same style and tone.";

    // Call OpenRouter in streaming mode
    const openrouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://workspace.app",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: context },
          ],
          stream: true,
        }),
      }
    );

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text().catch(() => "");
      return NextResponse.json(
        {
          message: `OpenRouter streaming error: ${openrouterResponse.status}${
            errorText ? ` — ${errorText}` : ""
          }`,
        },
        { status: 502 }
      );
    }

    // Transform OpenRouter SSE into simpler token events
    const reader = openrouterResponse.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { message: "Failed to get response stream" },
        { status: 502 }
      );
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              // OpenRouter sends "[DONE]" when streaming finishes
              if (trimmed === "data: [DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              if (trimmed.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(trimmed.slice(6));
                  const token =
                    parsed?.choices?.[0]?.delta?.content ?? "";
                  if (token) {
                    const payload = `data: ${JSON.stringify({ token })}\n\n`;
                    controller.enqueue(encoder.encode(payload));
                  }
                } catch {
                  // Skip malformed JSON lines
                }
              }
            }
          }
        } catch (err) {
          // Stream was aborted by client — normal
          if (err instanceof Error && err.name === "AbortError") {
            // Expected when client disconnects
          } else {
            console.error("SSE stream error:", err);
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Complete error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message }, { status: 500 });
  }
}
