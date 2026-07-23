import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { db } from "@/db/db";
import { notebooksTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createNotebookSchema } from "@/interface/notebook";

// ─── Auth helper ─────────────────────────────────────────────────────────────

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

// ─── GET /api/notebooks — list user's notebooks ──────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const notebooks = await db
      .select({
        id: notebooksTable.id,
        title: notebooksTable.title,
        subtitle: notebooksTable.subtitle,
        icon: notebooksTable.icon,
        content: notebooksTable.content,
        createdAt: notebooksTable.createdAt,
        updatedAt: notebooksTable.updatedAt,
      })
      .from(notebooksTable)
      .where(eq(notebooksTable.userId, userId))
      .orderBy(desc(notebooksTable.updatedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ data: notebooks });
  } catch (error) {
    console.error("List notebooks error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// ─── POST /api/notebooks — create a notebook ────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createNotebookSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, subtitle, icon, content } = validation.data;

    const [notebook] = await db
      .insert(notebooksTable)
      .values({
        userId,
        title,
        subtitle: subtitle || null,
        icon: icon || "📝",
        content,
      })
      .returning();

    return NextResponse.json({ data: notebook }, { status: 201 });
  } catch (error) {
    console.error("Create notebook error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
