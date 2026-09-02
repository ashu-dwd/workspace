import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { db } from "@/db/db";
import { notebooksTable, notebookSharesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

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

const updateRoleSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

// PATCH /api/notebooks/[id]/share/[shareId] — update role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> },
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, shareId } = await params;
    const notebookId = Number(id);
    const targetShareId = Number(shareId);
    if (isNaN(notebookId) || isNaN(targetShareId)) {
      return NextResponse.json({ message: "Invalid IDs" }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateRoleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    // Verify user is owner of the notebook
    const [notebook] = await db
      .select({ userId: notebooksTable.userId })
      .from(notebooksTable)
      .where(eq(notebooksTable.id, notebookId))
      .limit(1);

    if (!notebook) {
      return NextResponse.json({ message: "Notebook not found" }, { status: 404 });
    }

    if (notebook.userId !== userId) {
      return NextResponse.json(
        { message: "Only the owner can modify collaborator roles" },
        { status: 403 },
      );
    }

    const [updated] = await db
      .update(notebookSharesTable)
      .set({ role: validation.data.role })
      .where(
        and(
          eq(notebookSharesTable.id, targetShareId),
          eq(notebookSharesTable.notebookId, notebookId),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ message: "Share not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update share role error:", error);
    return NextResponse.json({ message: "An unexpected error occurred" }, { status: 500 });
  }
}

// DELETE /api/notebooks/[id]/share/[shareId] — remove collaborator access
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> },
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, shareId } = await params;
    const notebookId = Number(id);
    const targetShareId = Number(shareId);
    if (isNaN(notebookId) || isNaN(targetShareId)) {
      return NextResponse.json({ message: "Invalid IDs" }, { status: 400 });
    }

    // Fetch share record to verify user rights
    const [share] = await db
      .select()
      .from(notebookSharesTable)
      .where(
        and(
          eq(notebookSharesTable.id, targetShareId),
          eq(notebookSharesTable.notebookId, notebookId),
        ),
      )
      .limit(1);

    if (!share) {
      return NextResponse.json({ message: "Share record not found" }, { status: 404 });
    }

    const [notebook] = await db
      .select({ userId: notebooksTable.userId })
      .from(notebooksTable)
      .where(eq(notebooksTable.id, notebookId))
      .limit(1);

    const isOwner = notebook?.userId === userId;
    const isSelfRemove = share.sharedWithUserId === userId;

    if (!isOwner && !isSelfRemove) {
      return NextResponse.json(
        { message: "You do not have permission to remove this collaborator" },
        { status: 403 },
      );
    }

    await db
      .delete(notebookSharesTable)
      .where(eq(notebookSharesTable.id, targetShareId));

    return NextResponse.json({ message: "Collaborator access removed" });
  } catch (error) {
    console.error("Delete share error:", error);
    return NextResponse.json({ message: "An unexpected error occurred" }, { status: 500 });
  }
}
