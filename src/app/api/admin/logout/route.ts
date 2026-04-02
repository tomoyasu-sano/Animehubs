import { NextResponse } from "next/server";

/**
 * レガシー管理者ログアウトAPI — NextAuth v5 signOutに移行済み。
 * 旧クライアントがアクセスした場合は 410 Gone を返す。
 */
export async function POST() {
  return NextResponse.json(
    { error: "Admin logout has been migrated to NextAuth signOut. Use /admin layout logout button." },
    { status: 410 }
  );
}
