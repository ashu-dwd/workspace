import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { usersTable } from "@/db/schema";
import { db } from "@/db/db";
import { eq, or } from "drizzle-orm";
import { signUpSchema } from "@/interface/form";
import { generateToken } from "@/lib/jwt";
import { nanoid } from "nanoid";
import { sendEmail } from "@/lib/resend";

const isDev = process.env.NODE_ENV === "development";

// handling POST request for sign-up form submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    //  Validate input and return error if invalid
    const validation = signUpSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { username, email, password } = validation.data;

    //  Check if user already exists
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.email, email), eq(usersTable.username, username)))
      .limit(1);

    if (existingUser.length > 0) {
      const isEmailConflict = existingUser[0].email === email;
      return NextResponse.json(
        {
          message: isEmailConflict
            ? "Email already exists"
            : "Username already exists",
        },
        { status: 400 }
      );
    }

    //  Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    if (isDev) {
      // --- DEV: auto-verify, skip email ---
      const [user] = await db
        .insert(usersTable)
        .values({
          username,
          email,
          password: hashedPassword,
          isVerified: true,
        })
        .returning();

      const accessToken = generateToken(user, "1h");
      const refreshToken = generateToken(user, "7d");

      const response = NextResponse.json(
        {
          message: "Account created successfully",
          data: {
            token: { accessToken, refreshToken },
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
            },
          },
        },
        { status: 201 }
      );

      response.cookies.set("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 60 * 60,
        path: "/",
      });
      response.cookies.set("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    }

    // --- PRODUCTION: OTP flow with email ---
    const otp = nanoid(6).toUpperCase();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.insert(usersTable).values({
      username,
      email,
      password: hashedPassword,
      otp,
      otpExpiresAt,
    });

    const message = `Your OTP code is ${otp}. Please enter it to verify your account.`;
    const emailResponse = await sendEmail(email, "Verify your email", message);
    if (!emailResponse.success) {
      return NextResponse.json(
        { message: "Failed to send OTP code" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "User created successfully. Please check your email." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Sign-up error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// optional GET handler for testing the endpoint
export async function GET() {
  return NextResponse.json({ message: "Sign-up endpoint is working" });
}
