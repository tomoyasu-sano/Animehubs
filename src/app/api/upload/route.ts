import { NextResponse } from "next/server";

export const runtime = "edge";

// 画像アップロードは Cloudflare R2 が未設定のため現在利用不可
// TODO: Cloudflare R2 バインディングを設定後に実装
export async function POST() {
  return NextResponse.json(
    {
      error: "Image upload is not available. Please configure Cloudflare R2 for image storage.",
    },
    { status: 503 }
  );
}
