/*
 * /POST /api/auth/reset-pwd
 * @desc Reset user password using token
 * @access Public
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { message: "Token and new password are required" },
        { status: 400 },
      );
    }

    // Find the user with the given reset token
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.resetPwdToken, token))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json(
        { message: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    const user = users[0];

    // Check if token has expired
    if (
      user.resetPwdTokenExpiresAt &&
      new Date() > new Date(user.resetPwdTokenExpiresAt)
    ) {
      return NextResponse.json(
        { message: "Reset token has expired" },
        { status: 400 },
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user's password and clear the reset token
    await db
      .update(usersTable)
      .set({
        password: hashedPassword,
        resetPwdToken: null,
        resetPwdTokenExpiresAt: null,
      })
      .where(eq(usersTable.resetPwdToken, token));

    return NextResponse.json(
      { message: "Password reset successful" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}