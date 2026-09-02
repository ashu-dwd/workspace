import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { notebooksTable, notebookSharesTable } from "@/db/schema";
import { verifyToken } from "@/lib/jwt";

const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
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
    const body = (await request.json()) as HandleUploadBody;
    if (body.type !== "blob.generate-client-token") {
      return NextResponse.json(
        { message: "Invalid upload request" },
        { status: 400 },
      );
    }
    const { pathname, clientPayload } = body.payload;
    const notebookId = Number(clientPayload);
    if (!pathname || !Number.isInteger(notebookId) || notebookId <= 0) {
      return NextResponse.json(
        { message: "Invalid notebook ID" },
        { status: 400 },
      );
    }

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
        { message: "Forbidden" },
        { status: 403 },
      );
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (
        requestedPathname,
        requestedClientPayload,
      ) => {
        if (
          requestedClientPayload !== String(notebookId) ||
          requestedPathname !== pathname
        ) {
          throw new Error("Invalid upload request");
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_IMAGE_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId, notebookId }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Blob upload token error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
