import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";
import {
  updateOrderStatus,
  releaseReservedStock,
} from "@/lib/db/order-queries";
import type { OrderItem } from "@/lib/db/schema";

/**
 * 期限切れの pending_payment 注文をクリーンアップ
 * - 作成から30分以上経過した pending_payment → payment_failed + reserved_stock 解除
 *
 * 呼び出し方法:
 * - Cloudflare Cron Trigger（別 Worker）から POST
 * - 手動: curl -X POST /api/cron/cleanup-expired -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: Request) {
  // CRON_SECRET で保護（未設定時は全リクエスト拒否）
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // 期限切れの pending_payment 注文を取得
    const expiredOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "pending_payment"),
          lt(orders.createdAt, thirtyMinutesAgo.toISOString()),
        ),
      )
      .all();

    let cleaned = 0;

    for (const order of expiredOrders) {
      try {
        const items: OrderItem[] = JSON.parse(order.items);
        await releaseReservedStock(items);
        await updateOrderStatus(order.id, "payment_failed", {
          cancelledReason: "expired",
        });
        cleaned++;
        console.log(
          `Cleaned up expired order: ${order.orderNumber}`,
        );
      } catch (err) {
        console.error(
          `Failed to cleanup order ${order.orderNumber}:`,
          err,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      checked: expiredOrders.length,
      cleaned,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron cleanup error:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 },
    );
  }
}
