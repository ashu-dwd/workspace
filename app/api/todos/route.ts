import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { db } from "@/db/db";
import { notebooksTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { parseTodos } from "@/lib/todo-parser";

// ─── Auth helper ─────────────────────────────────────────────────────────────

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

// ─── GET /api/todos — list all unchecked todos across notebooks ──────────────

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const notebooks = await db
      .select({
        id: notebooksTable.id,
        title: notebooksTable.title,
        content: notebooksTable.content,
      })
      .from(notebooksTable)
      .where(eq(notebooksTable.userId, userId))
      .orderBy(desc(notebooksTable.updatedAt));

    const todos: Array<{
      notebookId: number;
      notebookTitle: string;
      index: number;
      text: string;
      checked: boolean;
    }> = [];

    for (const nb of notebooks) {
      const items = parseTodos(nb.content ?? "");
      for (const item of items) {
        todos.push({
          notebookId: nb.id,
          notebookTitle: nb.title,
          index: item.index,
          text: item.text,
          checked: item.checked,
        });
      }
    }

    return NextResponse.json({ data: todos });
  } catch (error) {
    console.error("List todos error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
