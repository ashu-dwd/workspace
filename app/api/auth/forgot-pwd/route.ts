/*
 * /POST /api/auth/forgot-pwd
 * @desc Send a password reset email to the user
 * @access Public
 */

import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/email";
import { db } from "@/db/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Check if the user exists in the database
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const targetUser = user[0];
    const resetToken = generateToken({ id: targetUser.id, email: targetUser.email }, "1h");

    // Save the reset token to the user's record in the database
    await db
      .update(usersTable)
      .set({
        resetPwdToken: resetToken,
        resetPwdTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }) // Token expires in 1 hour
      .where(eq(usersTable.email, email));

    // Send the password reset email
    await sendPasswordResetEmail(email, resetToken);

    return NextResponse.json(
      { message: "Password reset email sent" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
