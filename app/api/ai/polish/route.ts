import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { callOpenRouterNonStreaming } from "@/lib/ai";

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

// ─── POST /api/ai/polish ─────────────────────────────────────────────────────

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
    const content: string | undefined = body.content;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { message: "content is required and must be a string" },
        { status: 400 }
      );
    }

    const systemPrompt =
      "Improve the clarity and grammar of this text. Keep the original voice and tone. Do not change the meaning. Return only the polished text, no explanations.";

    const polished = await callOpenRouterNonStreaming(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ]);

    return NextResponse.json({ data: { polished } });
  } catch (error) {
    console.error("Polish error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message }, { status: 500 });
  }
}
