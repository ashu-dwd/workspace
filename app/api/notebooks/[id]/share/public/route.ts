import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { db } from "@/db/db";
import { notebooksTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

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

const updatePublicAccessSchema = z.object({
  publicAccess: z.enum(["off", "viewer", "editor"]),
});

// PATCH /api/notebooks/[id]/share/public — toggle/set public link sharing
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
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const validation = updatePublicAccessSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { publicAccess } = validation.data;

    // Verify ownership
    const [notebook] = await db
      .select({
        id: notebooksTable.id,
        userId: notebooksTable.userId,
        shareToken: notebooksTable.shareToken,
      })
      .from(notebooksTable)
      .where(eq(notebooksTable.id, notebookId))
      .limit(1);

    if (!notebook) {
      return NextResponse.json({ message: "Notebook not found" }, { status: 404 });
    }

    if (notebook.userId !== userId) {
      return NextResponse.json(
        { message: "Only the owner can update link sharing settings" },
        { status: 403 },
      );
    }

    let token = notebook.shareToken;
    if (!token && publicAccess !== "off") {
      token = nanoid(16);
    }

    const [updated] = await db
      .update(notebooksTable)
      .set({
        publicAccess,
        shareToken: token,
      })
      .where(eq(notebooksTable.id, notebookId))
      .returning({
        id: notebooksTable.id,
        publicAccess: notebooksTable.publicAccess,
        shareToken: notebooksTable.shareToken,
      });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update public access error:", error);
    return NextResponse.json({ message: "An unexpected error occurred" }, { status: 500 });
  }
}
