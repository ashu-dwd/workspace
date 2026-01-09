import { NextRequest, NextResponse } from "next/server";
import { verifyToken, generateToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { message: "Refresh token not found" },
        { status: 401 }
      );
    }

    try {
      const decoded = verifyToken(refreshToken);
      const user = decoded.user;

      const newAccessToken = generateToken(user, "1h");
      const newRefreshToken = generateToken(user, "7d");

      const response = NextResponse.json(
        {
          message: "Token refreshed successfully",
          data: {
            token: {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            },
          },
        },
        { status: 200 }
      );

      // Set cookies
      response.cookies.set("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour
        path: "/",
      });

      response.cookies.set("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });

      return response;
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid refresh token" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Refresh token error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
