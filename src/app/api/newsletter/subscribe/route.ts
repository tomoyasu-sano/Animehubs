import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-v2";
import { subscribeUser } from "@/lib/db/newsletter-queries";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    if (!checkRateLimit(request, "newsletter-subscribe", 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { locale?: string };
    const locale = body.locale;

    if (locale !== "en" && locale !== "sv") {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }

    const result = await subscribeUser(session.user.id, locale);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
