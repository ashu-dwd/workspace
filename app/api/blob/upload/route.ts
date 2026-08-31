import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { notebooksTable } from "@/db/schema";
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
    if (
      !pathname ||
      !Number.isInteger(notebookId) ||
      notebookId <= 0 ||
      !pathname.startsWith(`users/${userId}/notebooks/${notebookId}/`)
    ) {
      return NextResponse.json(
        { message: "Invalid notebook ID" },
        { status: 400 },
      );
    }

    const [notebook] = await db
      .select({ id: notebooksTable.id })
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
