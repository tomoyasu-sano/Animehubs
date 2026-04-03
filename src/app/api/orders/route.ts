import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-v2";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 10));
    const offset = (page - 1) * limit;

    const db = await getDb();

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(orders)
        .where(eq(orders.userId, session.user.id))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset)
        .all(),
      db
        .select({ cnt: count() })
        .from(orders)
        .where(eq(orders.userId, session.user.id))
        .get(),
    ]);

    return NextResponse.json({
      orders: items,
      total: totalResult?.cnt ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Failed to get orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
