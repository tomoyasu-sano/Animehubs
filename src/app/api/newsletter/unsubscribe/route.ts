import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/newsletter-token";
import { unsubscribeUser } from "@/lib/db/newsletter-queries";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    if (!checkRateLimit(request, "newsletter-unsubscribe", 5, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const secret = process.env.NEWSLETTER_HMAC_SECRET;
    if (!secret) {
      console.error("NEWSLETTER_HMAC_SECRET is not set");
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const result = verifyUnsubscribeToken(token, secret);

    if (!result.valid) {
      return NextResponse.json(
        { error: "Invalid token", reason: result.reason },
        { status: 400 },
      );
    }

    await unsubscribeUser(result.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
