import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { db } from "@/db/db";
import { notebooksTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateNotebookSchema } from "@/interface/notebook";

// Reusable pattern from codebase (dashboard route) — inline auth
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

//  GET /api/notebooks/[id] — get single notebook ──

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notebookId = Number(id);
    if (isNaN(notebookId)) {
      return NextResponse.json(
        { message: "Invalid notebook ID" },
        { status: 400 },
      );
    }

    const [notebook] = await db
      .select()
      .from(notebooksTable)
      .where(
        and(
          eq(notebooksTable.id, notebookId),
          eq(notebooksTable.userId, userId),
        ),
      )
      .limit(1);

    if (!notebook) {
      return NextResponse.json(
        { message: "Notebook not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: notebook });
  } catch (error) {
    console.error("Get notebook error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

//  PATCH /api/notebooks/[id] — update a notebook ──

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notebookId = Number(id);
    if (isNaN(notebookId)) {
      return NextResponse.json(
        { message: "Invalid notebook ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = updateNotebookSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    // Build update object — only set provided fields
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validation.data)) {
      if (value !== undefined) updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 },
      );
    }

    const [notebook] = await db
      .update(notebooksTable)
      .set(updates)
      .where(
        and(
          eq(notebooksTable.id, notebookId),
          eq(notebooksTable.userId, userId),
        ),
      )
      .returning();

    if (!notebook) {
      return NextResponse.json(
        { message: "Notebook not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: notebook });
  } catch (error) {
    console.error("Update notebook error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

//  DELETE /api/notebooks/[id] — delete a notebook ─

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notebookId = Number(id);
    if (isNaN(notebookId)) {
      return NextResponse.json(
        { message: "Invalid notebook ID" },
        { status: 400 },
      );
    }

    const [deleted] = await db
      .delete(notebooksTable)
      .where(
        and(
          eq(notebooksTable.id, notebookId),
          eq(notebooksTable.userId, userId),
        ),
      )
      .returning({ id: notebooksTable.id });

    if (!deleted) {
      return NextResponse.json(
        { message: "Notebook not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Notebook deleted" });
  } catch (error) {
    console.error("Delete notebook error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
