import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { db } from "@/db/db";
import {
  notebooksTable,
  notebookSharesTable,
  usersTable,
  notificationsTable,
} from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";

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

const shareSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  role: z.enum(["editor", "viewer"]).default("viewer"),
});

// GET /api/notebooks/[id]/share — list collaborators & public link info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notebookId = Number(id);
    if (isNaN(notebookId)) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    const [notebook] = await db
      .select({
        id: notebooksTable.id,
        userId: notebooksTable.userId,
        title: notebooksTable.title,
        shareToken: notebooksTable.shareToken,
        publicAccess: notebooksTable.publicAccess,
      })
      .from(notebooksTable)
      .where(eq(notebooksTable.id, notebookId))
      .limit(1);

    if (!notebook) {
      return NextResponse.json({ message: "Notebook not found" }, { status: 404 });
    }

    // Check if user is owner or shared collaborator
    const isOwner = notebook.userId === userId;
    const [userShare] = isOwner
      ? []
      : await db
          .select({ id: notebookSharesTable.id })
          .from(notebookSharesTable)
          .where(
            and(
              eq(notebookSharesTable.notebookId, notebookId),
              eq(notebookSharesTable.sharedWithUserId, userId),
            ),
          )
          .limit(1);

    if (!isOwner && !userShare) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Fetch owner details
    const [owner] = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        email: usersTable.email,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.id, notebook.userId))
      .limit(1);

    // Fetch collaborators
    const shares = await db
      .select({
        shareId: notebookSharesTable.id,
        userId: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        email: usersTable.email,
        avatarUrl: usersTable.avatarUrl,
        role: notebookSharesTable.role,
        createdAt: notebookSharesTable.createdAt,
      })
      .from(notebookSharesTable)
      .innerJoin(usersTable, eq(notebookSharesTable.sharedWithUserId, usersTable.id))
      .where(eq(notebookSharesTable.notebookId, notebookId));

    return NextResponse.json({
      data: {
        notebookId: notebook.id,
        isOwner,
        owner,
        publicAccess: notebook.publicAccess ?? "off",
        shareToken: notebook.shareToken,
        collaborators: shares,
      },
    });
  } catch (error) {
    console.error("Get share info error:", error);
    return NextResponse.json({ message: "An unexpected error occurred" }, { status: 500 });
  }
}

// POST /api/notebooks/[id]/share — invite collaborator
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notebookId = Number(id);
    if (isNaN(notebookId)) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const validation = shareSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { emailOrUsername, role } = validation.data;

    // Fetch notebook & verify ownership/editor role
    const [notebook] = await db
      .select({
        id: notebooksTable.id,
        userId: notebooksTable.userId,
        title: notebooksTable.title,
      })
      .from(notebooksTable)
      .where(eq(notebooksTable.id, notebookId))
      .limit(1);

    if (!notebook) {
      return NextResponse.json({ message: "Notebook not found" }, { status: 404 });
    }

    const isOwner = notebook.userId === userId;
    if (!isOwner) {
      const [editorShare] = await db
        .select({ id: notebookSharesTable.id })
        .from(notebookSharesTable)
        .where(
          and(
            eq(notebookSharesTable.notebookId, notebookId),
            eq(notebookSharesTable.sharedWithUserId, userId),
            eq(notebookSharesTable.role, "editor"),
          ),
        )
        .limit(1);

      if (!editorShare) {
        return NextResponse.json(
          { message: "Only notebook owners and editors can share access" },
          { status: 403 },
        );
      }
    }

    // Find target user
    const [targetUser] = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        displayName: usersTable.displayName,
      })
      .from(usersTable)
      .where(
        or(
          eq(usersTable.email, emailOrUsername.trim().toLowerCase()),
          eq(usersTable.username, emailOrUsername.trim()),
        ),
      )
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { message: "User not found with that email or username" },
        { status: 404 },
      );
    }

    if (targetUser.id === notebook.userId) {
      return NextResponse.json(
        { message: "Cannot share notebook with the owner" },
        { status: 400 },
      );
    }

    // Insert or update share record
    const [existingShare] = await db
      .select({ id: notebookSharesTable.id })
      .from(notebookSharesTable)
      .where(
        and(
          eq(notebookSharesTable.notebookId, notebookId),
          eq(notebookSharesTable.sharedWithUserId, targetUser.id),
        ),
      )
      .limit(1);

    let shareRecord;
    if (existingShare) {
      [shareRecord] = await db
        .update(notebookSharesTable)
        .set({ role })
        .where(eq(notebookSharesTable.id, existingShare.id))
        .returning();
    } else {
      [shareRecord] = await db
        .insert(notebookSharesTable)
        .values({
          notebookId,
          sharedWithUserId: targetUser.id,
          role,
          invitedByUserId: userId,
        })
        .returning();
    }

    // Get current user details for notification
    const [currentUser] = await db
      .select({
        username: usersTable.username,
        displayName: usersTable.displayName,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    const inviterName = currentUser?.displayName || currentUser?.username || "A user";

    // Create notification for target user
    await db.insert(notificationsTable).values({
      userId: targetUser.id,
      type: "notebook_shared",
      message: `${inviterName} shared notebook "${notebook.title}" with you (${role}).`,
      isRead: false,
    });

    return NextResponse.json({
      data: {
        share: shareRecord,
        user: {
          id: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.displayName,
          email: targetUser.email,
        },
      },
    });
  } catch (error) {
    console.error("Share notebook error:", error);
    return NextResponse.json({ message: "An unexpected error occurred" }, { status: 500 });
  }
}
