import { NextResponse } from "next/server";
import { getAdminCookieName } from "@/lib/auth";

export const runtime = "edge";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" });

  response.cookies.set(getAdminCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
