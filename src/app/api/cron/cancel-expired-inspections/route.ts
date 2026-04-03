import { NextResponse } from "next/server";
import {
  getExpiredInspectionOrders,
  updateOrderStatus,
  releaseReservedStock,
} from "@/lib/db/order-queries";
import {
  sendOrderCancellationEmail,
  sendAdminNewOrderEmail,
} from "@/lib/email/send-order-email";
import { ADMIN_EMAILS } from "@/lib/constants";
import type { OrderItem } from "@/lib/db/schema";

/**
 * 期限切れ reserved 注文の自動キャンセル + 在庫仮押さえ解除
 * ※ v2: Stripe返金なし（予約時は決済していないため）
 *
 * 呼び出し方法:
 * - Cloudflare Cron Trigger（毎時: 0 * * * *）
 * - 手動: curl -X POST /api/cron/cancel-expired-inspections -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: Request) {
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
    const expiredOrders = await getExpiredInspectionOrders();
    let cancelled = 0;
    let failed = 0;

    for (const order of expiredOrders) {
      try {
        // ステータスを先に cancelled に更新（二重処理防止）
        await updateOrderStatus(order.id, "cancelled", {
          cancelledReason: "expired",
        });

        // 在庫仮押さえ解除（reserved_stock -N）
        const items: OrderItem[] = JSON.parse(order.items);
        await releaseReservedStock(items);

        // 顧客にキャンセル通知メール
        const cancelledOrder = { ...order, status: "cancelled", cancelledReason: "expired" };
        sendOrderCancellationEmail(cancelledOrder).catch((err) =>
          console.error(
            `Failed to send cancellation email for ${order.orderNumber}:`,
            err,
          ),
        );

        cancelled++;
        console.log(
          `Auto-cancelled expired reservation: ${order.orderNumber}`,
        );
      } catch (err) {
        failed++;
        console.error(
          `Failed to cancel reservation ${order.orderNumber}:`,
          err,
        );

        sendAdminNewOrderEmail(
          {
            ...order,
            customerName: `[AUTO-CANCEL FAILED] ${order.customerName}`,
          },
          ADMIN_EMAILS,
        ).catch(() => {});
      }
    }

    return NextResponse.json({
      ok: true,
      checked: expiredOrders.length,
      cancelled,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron cancel-expired-inspections error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 },
    );
  }
}
