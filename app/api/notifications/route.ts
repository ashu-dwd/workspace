import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { db } from "@/db/db";
import { notificationsTable } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { updateNotificationSchema } from "@/interface/notification";

// Auth helper
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

// GET /api/notifications — list notifications for the logged-in user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const conditions = unreadOnly
      ? and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.isRead, false),
        )
      : eq(notificationsTable.userId, userId);

    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(conditions)
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Calculate unread count for user
    const unreadItems = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.isRead, false),
        ),
      );

    return NextResponse.json({
      data: notifications,
      unreadCount: unreadItems.length,
    });
  } catch (error) {
    console.error("List notifications error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

// PATCH /api/notifications — bulk update (e.g. mark all as read or mark single/list by payload)
export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateNotificationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { markAllAsRead, id, isRead } = validation.data;

    if (markAllAsRead) {
      await db
        .update(notificationsTable)
        .set({ isRead: true })
        .where(
          and(
            eq(notificationsTable.userId, userId),
            eq(notificationsTable.isRead, false),
          ),
        );

      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (id !== undefined) {
      const targetIsRead = isRead !== undefined ? isRead : true;
      const [updated] = await db
        .update(notificationsTable)
        .set({ isRead: targetIsRead })
        .where(
          and(
            eq(notificationsTable.id, id),
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
    }

    return NextResponse.json(
      { message: "No operation specified" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Update notifications error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

// DELETE /api/notifications — bulk delete (clear all notifications for user)
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await db
      .delete(notificationsTable)
      .where(eq(notificationsTable.userId, userId));

    return NextResponse.json({ message: "All notifications deleted" });
  } catch (error) {
    console.error("Delete notifications error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
