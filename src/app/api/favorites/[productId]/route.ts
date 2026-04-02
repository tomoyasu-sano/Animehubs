import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-v2";
import { removeFavorite } from "@/lib/db/favorite-queries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await params;

    if (!productId || typeof productId !== "string" || !UUID_RE.test(productId)) {
      return NextResponse.json(
        { error: "Invalid productId" },
        { status: 400 },
      );
    }

    const result = await removeFavorite(session.user.id, productId);

    if (!result.success) {
      if (result.reason === "not_found") {
        return NextResponse.json(
          { error: "Favorite not found" },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
