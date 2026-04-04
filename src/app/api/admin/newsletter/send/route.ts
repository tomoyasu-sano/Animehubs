import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { sendNewsletter } from "@/lib/email/send-newsletter";

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      subjectEn?: string;
      subjectSv?: string;
      bodyEn?: string;
      bodySv?: string;
      includeRecentProducts?: boolean;
      recentProductsDays?: number;
      testMode?: boolean;
    };
    const {
      subjectEn,
      subjectSv,
      bodyEn,
      bodySv,
      includeRecentProducts = false,
      recentProductsDays = 7,
      testMode = false,
    } = body;

    // バリデーション
    if (!subjectEn || typeof subjectEn !== "string") {
      return NextResponse.json({ error: "subjectEn is required" }, { status: 400 });
    }
    if (!subjectSv || typeof subjectSv !== "string") {
      return NextResponse.json({ error: "subjectSv is required" }, { status: 400 });
    }
    if (subjectEn.length > 200) {
      return NextResponse.json({ error: "subjectEn must be 200 characters or less" }, { status: 400 });
    }
    if (subjectSv.length > 200) {
      return NextResponse.json({ error: "subjectSv must be 200 characters or less" }, { status: 400 });
    }
    if (!bodyEn || typeof bodyEn !== "string") {
      return NextResponse.json({ error: "bodyEn is required" }, { status: 400 });
    }
    if (!bodySv || typeof bodySv !== "string") {
      return NextResponse.json({ error: "bodySv is required" }, { status: 400 });
    }
    if (bodyEn.length > 10000) {
      return NextResponse.json({ error: "bodyEn must be 10000 characters or less" }, { status: 400 });
    }
    if (bodySv.length > 10000) {
      return NextResponse.json({ error: "bodySv must be 10000 characters or less" }, { status: 400 });
    }
    if (typeof recentProductsDays === "number" && (recentProductsDays < 1 || recentProductsDays > 30)) {
      return NextResponse.json({ error: "recentProductsDays must be between 1 and 30" }, { status: 400 });
    }

    const result = await sendNewsletter({
      subjectEn,
      subjectSv,
      bodyEn,
      bodySv,
      includeRecentProducts: !!includeRecentProducts,
      recentProductsDays: recentProductsDays || 7,
      testMode: !!testMode,
      adminEmail: admin.email,
    });

    if (!result.success && result.error?.includes("recently sent")) {
      return NextResponse.json({ error: result.error }, { status: 429 });
    }

    if (!result.success) {
      console.error("Newsletter send failed:", result);
      return NextResponse.json(
        { success: false, error: result.error, sent: result.sent, failed: result.failed },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error("Admin newsletter send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
