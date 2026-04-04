import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { upsertAnnouncement } from "@/lib/db/announcement-queries";

export async function PUT(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      id?: string;
      messageEn?: string;
      messageSv?: string;
      active?: boolean;
    };
    const { id, messageEn, messageSv, active } = body;

    // バリデーション
    if (id !== undefined && (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
      return NextResponse.json({ error: "Invalid id format" }, { status: 400 });
    }
    if (!messageEn || typeof messageEn !== "string") {
      return NextResponse.json({ error: "messageEn is required" }, { status: 400 });
    }
    if (!messageSv || typeof messageSv !== "string") {
      return NextResponse.json({ error: "messageSv is required" }, { status: 400 });
    }
    if (messageEn.length > 500) {
      return NextResponse.json({ error: "messageEn must be 500 characters or less" }, { status: 400 });
    }
    if (messageSv.length > 500) {
      return NextResponse.json({ error: "messageSv must be 500 characters or less" }, { status: 400 });
    }

    const result = await upsertAnnouncement({
      id,
      messageEn,
      messageSv,
      active: !!active,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin announcements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
