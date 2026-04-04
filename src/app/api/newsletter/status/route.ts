import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-v2";
import { getSubscriptionStatus } from "@/lib/db/newsletter-queries";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ subscribed: false });
    }

    const subscribed = await getSubscriptionStatus(session.user.id);
    return NextResponse.json({ subscribed });
  } catch (error) {
    console.error("Newsletter status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
