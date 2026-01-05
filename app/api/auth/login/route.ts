import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/jwt";

interface LoginRequest {
  username: string;
  password: string;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body as LoginRequest;

  if (!username || !password) {
    return NextResponse.json(
      { message: "Username and password are required" },
      { status: 400 }
    );
  }

  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Invalid password" },
        { status: 401 }
      );
    }

    const token = generateToken(user);

    return NextResponse.json(
      {
        message: "Login successful",
        data: { username, role: user.role, token },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Failed to login" }, { status: 500 });
  }
}
