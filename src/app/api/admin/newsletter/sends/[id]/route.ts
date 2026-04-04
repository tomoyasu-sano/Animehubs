import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getNewsletterSendById } from "@/lib/db/newsletter-sends-queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const send = await getNewsletterSendById(id);

    if (!send) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(send);
  } catch (error) {
    console.error("Admin newsletter send detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
