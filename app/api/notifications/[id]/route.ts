import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { db } from "@/db/db";
import { notificationsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

// PATCH /api/notifications/[id] — update read status of single notification
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notificationId = Number(id);
    if (isNaN(notificationId)) {
      return NextResponse.json(
        { message: "Invalid notification ID" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const isRead = typeof body.isRead === "boolean" ? body.isRead : true;

    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead })
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, userId),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { message: "Notification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update notification item error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

// DELETE /api/notifications/[id] — delete single notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notificationId = Number(id);
    if (isNaN(notificationId)) {
      return NextResponse.json(
        { message: "Invalid notification ID" },
        { status: 400 },
      );
    }

    const [deleted] = await db
      .delete(notificationsTable)
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, userId),
        ),
      )
      .returning({ id: notificationsTable.id });

    if (!deleted) {
      return NextResponse.json(
        { message: "Notification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Delete notification item error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
