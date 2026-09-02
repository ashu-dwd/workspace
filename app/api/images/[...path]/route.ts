import { get } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { notebooksTable, notebookSharesTable } from "@/db/schema";
import { verifyToken } from "@/lib/jwt";

function getUserId(request: NextRequest): number | null {
  const token = request.cookies.get("accessToken")?.value;
  if (!token) return null;
  try {
    return verifyToken(token).user.id;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const userId = getUserId(request);
  const resolvedParams = await params;
  const pathname = resolvedParams.path.join("/");

  // Match pattern: users/{ownerId}/notebooks/{notebookId}/{filename}
  const match = pathname.match(/^users\/([^/]+)\/notebooks\/(\d+)\/(.+)$/);
  if (!match) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ownerId = Number(match[1]);
  const notebookId = Number(match[2]);
  if (isNaN(ownerId) || isNaN(notebookId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Fetch notebook details
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
    return new NextResponse("Not found", { status: 404 });
  }

  // Permission checks for image access:
  // 1. Is requesting user the owner?
  let hasAccess = userId !== null && userId === notebook.userId;

  // 2. Is requesting user a shared collaborator (editor or viewer)?
  if (!hasAccess && userId !== null) {
    const [share] = await db
      .select({ id: notebookSharesTable.id })
      .from(notebookSharesTable)
      .where(
        and(
          eq(notebookSharesTable.notebookId, notebookId),
          eq(notebookSharesTable.sharedWithUserId, userId),
        ),
      )
      .limit(1);

    if (share) {
      hasAccess = true;
    }
  }

  // 3. Is public link access enabled on the notebook?
  if (!hasAccess && notebook.publicAccess && notebook.publicAccess !== "off") {
    hasAccess = true;
  }

  if (!hasAccess) {
    return new NextResponse("Unauthorized", { status: userId ? 403 : 401 });
  }

  const blob = await get(pathname, { access: "private" });
  if (!blob || blob.statusCode !== 200) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType,
      "Content-Length": String(blob.blob.size),
      "Cache-Control": "private, max-age=3600",
      ETag: blob.blob.etag,
    },
  });
}
