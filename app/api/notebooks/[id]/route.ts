import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { db } from "@/db/db";
import { notebooksTable, notebookSharesTable, notificationsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateNotebookSchema } from "@/interface/notebook";

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

// GET /api/notebooks/[id] — get single notebook with permission calculation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserId(request);
    const { id } = await params;
    const notebookId = Number(id);
    if (isNaN(notebookId)) {
      return NextResponse.json({ message: "Invalid notebook ID" }, { status: 400 });
    }

    const [notebook] = await db
      .select()
      .from(notebooksTable)
      .where(eq(notebooksTable.id, notebookId))
      .limit(1);

    if (!notebook) {
      return NextResponse.json({ message: "Notebook not found" }, { status: 404 });
    }

    let effectiveRole: "owner" | "editor" | "viewer" | null = null;

    if (userId && notebook.userId === userId) {
      effectiveRole = "owner";
    } else if (userId) {
      const [share] = await db
        .select({ role: notebookSharesTable.role })
        .from(notebookSharesTable)
        .where(
          and(
            eq(notebookSharesTable.notebookId, notebookId),
            eq(notebookSharesTable.sharedWithUserId, userId),
          ),
        )
        .limit(1);

      if (share) {
        effectiveRole = share.role;
      }
    }

    if (!effectiveRole && notebook.publicAccess !== "off") {
      effectiveRole = notebook.publicAccess as "editor" | "viewer";
    }

    if (!effectiveRole) {
      return NextResponse.json(
        { message: userId ? "Access denied" : "Unauthorized" },
        { status: userId ? 403 : 401 },
      );
    }

    return NextResponse.json({
      data: {
        ...notebook,
        userRole: effectiveRole,
      },
    });
  } catch (error) {
    console.error("Get notebook error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

// PATCH /api/notebooks/[id] — update a notebook (owner or editor)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserId(request);
    const { id } = await params;
    const notebookId = Number(id);
    if (isNaN(notebookId)) {
      return NextResponse.json({ message: "Invalid notebook ID" }, { status: 400 });
    }

    const [notebook] = await db
      .select()
      .from(notebooksTable)
      .where(eq(notebooksTable.id, notebookId))
      .limit(1);

    if (!notebook) {
      return NextResponse.json({ message: "Notebook not found" }, { status: 404 });
    }

    let canEdit = false;
    if (userId && notebook.userId === userId) {
      canEdit = true;
    } else if (userId) {
      const [editorShare] = await db
        .select({ id: notebookSharesTable.id })
        .from(notebookSharesTable)
        .where(
          and(
            eq(notebookSharesTable.notebookId, notebookId),
            eq(notebookSharesTable.sharedWithUserId, userId),
            eq(notebookSharesTable.role, "editor"),
          ),
        )
        .limit(1);
      canEdit = !!editorShare;
    }

    if (!canEdit && notebook.publicAccess === "editor") {
      canEdit = true;
    }

    if (!canEdit) {
      return NextResponse.json(
        { message: "You do not have permission to edit this notebook" },
        { status: 403 },
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

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validation.data)) {
      if (value !== undefined) updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(notebooksTable)
      .set(updates)
      .where(eq(notebooksTable.id, notebookId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update notebook error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

// DELETE /api/notebooks/[id] — delete a notebook (owner only)
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
      return NextResponse.json({ message: "Invalid notebook ID" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(notebooksTable)
      .where(
        and(
          eq(notebooksTable.id, notebookId),
          eq(notebooksTable.userId, userId),
        ),
      )
      .returning({ id: notebooksTable.id, title: notebooksTable.title });

    if (!deleted) {
      return NextResponse.json(
        { message: "Notebook not found or permission denied" },
        { status: 404 },
      );
    }

    await db.insert(notificationsTable).values({
      userId,
      type: "notebook_deleted",
      message: `Notebook "${deleted.title}" was deleted`,
      isRead: false,
    });

    return NextResponse.json({ message: "Notebook deleted" });
  } catch (error) {
    console.error("Delete notebook error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
