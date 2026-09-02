import { put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { notebooksTable, notebookSharesTable } from "@/db/schema";
import { verifyToken } from "@/lib/jwt";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function getUserId(request: NextRequest): number | null {
  const token = request.cookies.get("accessToken")?.value;
  if (!token) return null;
  try {
    return verifyToken(token).user.id;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const notebookId = Number(formData.get("notebookId"));

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Image is required" },
        { status: 400 },
      );
    }
    if (!Number.isInteger(notebookId) || notebookId <= 0) {
      return NextResponse.json(
        { message: "Invalid notebook ID" },
        { status: 400 },
      );
    }
    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Unsupported image type" },
        { status: 400 },
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { message: "Image must be 10 MB or smaller" },
        { status: 400 },
      );
    }

    // Check notebook existence & permissions
    const [notebook] = await db
      .select({
        id: notebooksTable.id,
        userId: notebooksTable.userId,
        publicAccess: notebooksTable.publicAccess,
      })
      .from(notebooksTable)
      .where(eq(notebooksTable.id, notebookId))
      .limit(1);

    if (!notebook) {
      return NextResponse.json(
        { message: "Notebook not found" },
        { status: 404 },
      );
    }

    // Edit permission check: Owner OR Shared Editor OR Public Link Editor
    let canEdit = notebook.userId === userId;

    if (!canEdit) {
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

      if (editorShare) canEdit = true;
    }

    if (!canEdit && notebook.publicAccess === "editor") {
      canEdit = true;
    }

    if (!canEdit) {
      return NextResponse.json(
        { message: "You do not have permission to upload images to this notebook" },
        { status: 403 },
      );
    }

    const safeName = (file.name || "pasted-image.png").replace(
      /[^a-zA-Z0-9._-]/g,
      "-",
    );
    const blob = await put(
      `users/${notebook.userId}/notebooks/${notebookId}/${safeName}`,
      file,
      { access: "private", addRandomSuffix: true },
    );

    const proxyUrl = `/api/images/${encodeURIComponent(blob.pathname)}`;
    return NextResponse.json({ url: proxyUrl });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { message: "Image upload failed" },
      { status: 500 },
    );
  }
}
