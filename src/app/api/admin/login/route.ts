import { NextResponse } from "next/server";

/**
 * レガシー管理者ログインAPI — NextAuth v5 Google OAuthに移行済み。
 * 旧クライアントがアクセスした場合は 410 Gone を返す。
 */
export async function POST() {
  return NextResponse.json(
    { error: "Admin login has been migrated to Google OAuth. Use /admin/login page." },
    { status: 410 }
  );
}
