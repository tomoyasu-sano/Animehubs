import { NextResponse } from "next/server";
import { getActiveAnnouncement } from "@/lib/db/announcement-queries";

export async function GET() {
  try {
    const announcement = await getActiveAnnouncement();
    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("Announcements active error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
