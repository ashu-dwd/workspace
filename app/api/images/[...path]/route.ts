import { get } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { notebooksTable } from "@/db/schema";
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
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const resolvedParams = await params;
  const pathname = resolvedParams.path.join("/");
  const match = pathname.match(/^users\/([^/]+)\/notebooks\/(\d+)\/(.+)$/);
  if (!match || Number(match[1]) !== userId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const notebookId = Number(match[2]);
  const [notebook] = await db
    .select({ id: notebooksTable.id })
    .from(notebooksTable)
    .where(
      and(eq(notebooksTable.id, notebookId), eq(notebooksTable.userId, userId)),
    )
    .limit(1);
  if (!notebook) return new NextResponse("Not found", { status: 404 });

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
