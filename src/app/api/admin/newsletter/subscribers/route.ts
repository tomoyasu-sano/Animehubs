import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getSubscriberCount, getSubscribersWithEmail } from "@/lib/db/newsletter-queries";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [count, subscribers] = await Promise.all([
      getSubscriberCount(),
      getSubscribersWithEmail(),
    ]);

    return NextResponse.json({ count, subscribers });
  } catch (error) {
    console.error("Admin newsletter subscribers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
