import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { db } from "@/db/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { updateProfileSchema, changePasswordSchema } from "@/interface/profile";

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

// ─── GET /api/user — fetch current user ──────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        email: usersTable.email,
        avatarUrl: usersTable.avatarUrl,
        role: usersTable.role,
        isVerified: usersTable.isVerified,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/user — update profile / change password ──────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // ── Profile fields ───────────────────────────────────────────────────────
    if (body.username !== undefined || body.displayName !== undefined || body.avatarUrl !== undefined) {
      const profileValidation = updateProfileSchema.safeParse(body);
      if (!profileValidation.success) {
        return NextResponse.json(
          { message: profileValidation.error.issues[0].message },
          { status: 400 }
        );
      }

      // Check username uniqueness if changing
      if (profileValidation.data.username) {
        const [existing] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.username, profileValidation.data.username))
          .limit(1);
        if (existing && existing.id !== userId) {
          return NextResponse.json(
            { message: "Username already taken" },
            { status: 409 }
          );
        }
        updates.username = profileValidation.data.username;
      }
      if (profileValidation.data.displayName !== undefined) {
        updates.displayName = profileValidation.data.displayName;
      }
      if (profileValidation.data.avatarUrl !== undefined) {
        updates.avatarUrl = profileValidation.data.avatarUrl;
      }
    }

    // ── Password change ──────────────────────────────────────────────────────
    if (body.currentPassword !== undefined) {
      const pwValidation = changePasswordSchema.safeParse(body);
      if (!pwValidation.success) {
        return NextResponse.json(
          { message: pwValidation.error.issues[0].message },
          { status: 400 }
        );
      }

      const [user] = await db
        .select({ password: usersTable.password })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      if (!user || !(await bcrypt.compare(pwValidation.data.currentPassword, user.password))) {
        return NextResponse.json(
          { message: "Current password is incorrect" },
          { status: 401 }
        );
      }

      updates.password = await bcrypt.hash(pwValidation.data.newPassword, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        email: usersTable.email,
        avatarUrl: usersTable.avatarUrl,
        role: usersTable.role,
      });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
