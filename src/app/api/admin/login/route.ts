import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { getAdminByUsername } from "@/lib/db/admin-queries";
import { verifyPassword, generateToken, getAdminCookieName } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    initializeDatabase();

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const admin = getAdminByUsername(username);
    if (!admin) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = generateToken({ userId: admin.id, username: admin.username });

    const response = NextResponse.json({
      message: "Login successful",
      user: { id: admin.id, username: admin.username },
    });

    // Cookie にトークンをセット
    response.cookies.set(getAdminCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24時間
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
