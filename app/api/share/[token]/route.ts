import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { notebooksTable, usersTable } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

// GET /api/share/[token] — fetch public notebook details by share token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ message: "Token is required" }, { status: 400 });
    }

    const [notebook] = await db
      .select({
        id: notebooksTable.id,
        title: notebooksTable.title,
        subtitle: notebooksTable.subtitle,
        icon: notebooksTable.icon,
        content: notebooksTable.content,
        publicAccess: notebooksTable.publicAccess,
        createdAt: notebooksTable.createdAt,
        updatedAt: notebooksTable.updatedAt,
        owner: {
          username: usersTable.username,
          displayName: usersTable.displayName,
          avatarUrl: usersTable.avatarUrl,
        },
      })
      .from(notebooksTable)
      .innerJoin(usersTable, eq(notebooksTable.userId, usersTable.id))
      .where(
        and(
          eq(notebooksTable.shareToken, token),
          ne(notebooksTable.publicAccess, "off"),
        ),
      )
      .limit(1);

    if (!notebook) {
      return NextResponse.json(
        { message: "Shared notebook not found or link has expired" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: {
        ...notebook,
        role: notebook.publicAccess, // "viewer" or "editor"
      },
    });
  } catch (error) {
    console.error("Get public notebook error:", error);
    return NextResponse.json({ message: "An unexpected error occurred" }, { status: 500 });
  }
}
