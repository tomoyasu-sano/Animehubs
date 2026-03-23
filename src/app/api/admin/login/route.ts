import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword, generateToken, getAdminCookieName } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// 1分間に5回まで
const LOGIN_RATE_LIMIT = 5;
const LOGIN_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  if (!checkRateLimit(request, "admin-login", LOGIN_RATE_LIMIT, LOGIN_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const token = generateToken();

    const response = NextResponse.json({
      message: "Login successful",
    });

    response.cookies.set(getAdminCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
