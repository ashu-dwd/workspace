import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { usersTable } from "@/db/schema";
import { db } from "@/db/db";

// handling POST request for sign-up form submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // create user in database
    console.log("Sign-up request:", { username, email });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db
      .insert(usersTable)
      .values({ username, email, password: hashedPassword });
    return NextResponse.json(
      { message: "User created successfully", user: { username, email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Sign-up error:", error);
    return NextResponse.json(
      { message: "Failed to create user" },
      { status: 500 }
    );
  }
}

// optional GET handler for testing the endpoint
export async function GET() {
  return NextResponse.json({ message: "Sign-up endpoint is working" });
}
