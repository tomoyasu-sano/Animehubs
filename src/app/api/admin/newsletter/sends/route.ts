import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getNewsletterSends } from "@/lib/db/newsletter-sends-queries";

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0);

    const result = await getNewsletterSends(limit, offset);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin newsletter sends error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
