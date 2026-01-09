import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendEmail } from "@/lib/resend";
import { resendOtpSchema } from "@/interface/form";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validate input
    const validation = resendOtpSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // 2. Check if user exists and is not already verified
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const user = users[0];
    if (user.isVerified) {
      return NextResponse.json(
        { message: "User is already verified" },
        { status: 400 }
      );
    }

    // 3. Generate new OTP and update expiry
    const otp = nanoid(6).toUpperCase();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db
      .update(usersTable)
      .set({ otp, otpExpiresAt })
      .where(eq(usersTable.email, email));

    // 4. Send email
    const message = `Your new OTP code is ${otp}. Please enter it to verify your account.`;
    const emailResponse = await sendEmail(
      email,
      "Resend: Verify your email",
      message
    );

    if (!emailResponse.success) {
      return NextResponse.json(
        { message: "Failed to send OTP code" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "New OTP code sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
