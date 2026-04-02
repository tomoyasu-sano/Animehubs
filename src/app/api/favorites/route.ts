import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-v2";
import { addFavorite, getUserFavorites } from "@/lib/db/favorite-queries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await getUserFavorites(session.user.id);
    return NextResponse.json(favorites);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const { productId } = body as { productId?: string };

    if (!productId || typeof productId !== "string" || !UUID_RE.test(productId)) {
      return NextResponse.json(
        { error: "productId is required and must be a valid UUID" },
        { status: 400 },
      );
    }

    const result = await addFavorite(session.user.id, productId);

    if (!result.success) {
      if (result.reason === "already_exists") {
        return NextResponse.json(
          { error: "Already favorited" },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
