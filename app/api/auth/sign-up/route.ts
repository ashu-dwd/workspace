import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { usersTable } from "@/db/schema";
import { db } from "@/db/db";
import { eq, or } from "drizzle-orm";
import { signUpSchema } from "@/interface/form";
import { generateToken } from "@/lib/jwt";

// handling POST request for sign-up form submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    //  Validate input and return error if invalid
    const validation = signUpSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 },
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
        { status: 400 },
      );
    }

    //  Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Email verification is intentionally disabled. Create a verified account
    // and establish the session without calling the email provider.
    const [user] = await db
      .insert(usersTable)
      .values({
        username,
        email,
        password: hashedPassword,
        isVerified: true,
      })
      .returning();

    const tokenUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
    const accessToken = generateToken(tokenUser, "1h");
    const refreshToken = generateToken(tokenUser, "7d");

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
      { status: 201 },
    );

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60,
      path: "/",
    });
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Sign-up error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

// optional GET handler for testing the endpoint
export async function GET() {
  return NextResponse.json({ message: "Sign-up endpoint is working" });
}
