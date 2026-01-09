import { db } from "@/db/db";
import { usersTable } from "@/db/schema";
import { verifyOtpSchema } from "@/interface/form";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { generateToken } from "@/lib/jwt";
import z from "zod";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { otp, email } = verifyOtpSchema.parse(body);

  //  Verify OTP code and return response
  try {
    //checking if email exits in the database
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (existingUser.length === 0 || !existingUser) {
      return NextResponse.json(
        { message: "Invalid email or OTP code" },
        { status: 400 }
      );
    }

    //checking if user is already verified
    const isVerified = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.email, email), eq(usersTable.isVerified, true)))
      .limit(1);
    if (isVerified.length > 0) {
      return NextResponse.json(
        { message: "OTP code already verified" },
        { status: 400 }
      );
    }
    //checking if otp matches
    const user = existingUser[0];
    if (user.otp !== otp) {
      return NextResponse.json(
        { message: "Invalid email or OTP code" },
        { status: 400 }
      );
    }

    // Checking if OTP is expired
    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return NextResponse.json(
        { message: "OTP code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    //updating user as verified
    await db
      .update(usersTable)
      .set({ isVerified: true, otp: null, otpExpiresAt: null })
      .where(eq(usersTable.email, email));

    // Generate tokens
    const accessToken = generateToken(user, "1h");
    const refreshToken = generateToken(user, "7d");

    const response = NextResponse.json(
      {
        message: "OTP verification successful",
        data: {
          token: {
            accessToken,
            refreshToken,
          },
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        },
      },
      { status: 200 }
    );

    // Set cookies
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
