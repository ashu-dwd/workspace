import { put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { notebooksTable } from "@/db/schema";
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

    const safeName = (file.name || "pasted-image.png").replace(
      /[^a-zA-Z0-9._-]/g,
      "-",
    );
    const blob = await put(
      `users/${userId}/notebooks/${notebookId}/${safeName}`,
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
