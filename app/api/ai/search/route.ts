import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { callOpenRouterNonStreaming } from "@/lib/ai";

// th helpers

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

// pes

interface NotebookInput {
  id: number;
  title: string;
  content: string;
}

// ST /api/ai/search ─

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
        { status: 400 },
      );
    }

    const body = await request.json();
    const query: string | undefined = body.query;
    const notebooks: NotebookInput[] | undefined = body.notebooks;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { message: "query is required and must be a string" },
        { status: 400 },
      );
    }

    if (!Array.isArray(notebooks) || notebooks.length === 0) {
      return NextResponse.json(
        { message: "notebooks must be a non-empty array" },
        { status: 400 },
      );
    }

    // Build context from notebooks
    const notebookContext = notebooks
      .map((nb) => `# ${nb.title}\n${nb.content || "(empty)"}`)
      .join("\n\n---\n\n");

    const systemPrompt = `Answer the user's question based on their notebook contents. Cite the notebook title(s). Be concise.

Notebooks:
${notebookContext}`;

    const answer = await callOpenRouterNonStreaming(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ]);

    // Extract citations — assume any notebook title mentioned in the answer is a citation
    // This is a simple heuristic; can be refined later
    const citations = notebooks
      .filter((nb) => answer.includes(nb.title))
      .map((nb) => nb.title);

    return NextResponse.json({ data: { answer, citations } });
  } catch (error) {
    console.error("Search error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message }, { status: 500 });
  }
}
