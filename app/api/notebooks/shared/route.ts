import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { db } from "@/db/db";
import { notebooksTable, notebookSharesTable, usersTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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

// GET /api/notebooks/shared — list notebooks shared with current user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const sharedNotebooks = await db
      .select({
        id: notebooksTable.id,
        title: notebooksTable.title,
        subtitle: notebooksTable.subtitle,
        icon: notebooksTable.icon,
        content: notebooksTable.content,
        createdAt: notebooksTable.createdAt,
        updatedAt: notebooksTable.updatedAt,
        shareRole: notebookSharesTable.role,
        shareId: notebookSharesTable.id,
        owner: {
          id: usersTable.id,
          username: usersTable.username,
          displayName: usersTable.displayName,
          email: usersTable.email,
          avatarUrl: usersTable.avatarUrl,
        },
      })
      .from(notebookSharesTable)
      .innerJoin(notebooksTable, eq(notebookSharesTable.notebookId, notebooksTable.id))
      .innerJoin(usersTable, eq(notebooksTable.userId, usersTable.id))
      .where(eq(notebookSharesTable.sharedWithUserId, userId))
      .orderBy(desc(notebookSharesTable.createdAt));

    return NextResponse.json({ data: sharedNotebooks });
  } catch (error) {
    console.error("List shared notebooks error:", error);
    return NextResponse.json({ message: "An unexpected error occurred" }, { status: 500 });
  }
}
