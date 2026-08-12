import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { db } from "@/db/db";
import { notebooksTable, usersTable } from "@/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    //  Authenticate via accessToken cookie
    const accessToken = request.cookies.get("accessToken")?.value;
    if (!accessToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = verifyToken(accessToken);
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const userId: number = decoded.user.id;

    //  Query user's notebook stats
    const [{ notebookCount }] = await db
      .select({ notebookCount: count() })
      .from(notebooksTable)
      .where(eq(notebooksTable.userId, userId));

    //  Query recent 6 notebooks
    const recentNotebooks = await db
      .select({
        id: notebooksTable.id,
        title: notebooksTable.title,
        subtitle: notebooksTable.subtitle,
        updatedAt: notebooksTable.updatedAt,
      })
      .from(notebooksTable)
      .where(eq(notebooksTable.userId, userId))
      .orderBy(desc(notebooksTable.updatedAt))
      .limit(6);

    return NextResponse.json({
      stats: {
        totalNotebooks: Number(notebookCount),
      },
      recentNotebooks,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
