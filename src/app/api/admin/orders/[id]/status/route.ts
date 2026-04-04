import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { updateOrderStatus, releaseReservedStock } from "@/lib/db/order-queries";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { OrderItem } from "@/lib/db/schema";

interface StatusUpdateRequest {
  status: string;
  cancelledReason?: string;
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  reserved: ["cancelled", "completed"],
  paid: ["shipped", "completed"],
  shipped: ["delivered"],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as StatusUpdateRequest;

    if (!body.status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .get();

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(body.status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${order.status}' to '${body.status}'`,
        },
        { status: 400 },
      );
    }

    // reserved → cancelled: 在庫仮押さえ解除
    if (order.status === "reserved" && body.status === "cancelled") {
      const items: OrderItem[] = JSON.parse(order.items);
      await releaseReservedStock(items);
    }

    const extra: Partial<{ cancelledReason: string }> = {};
    if (body.cancelledReason) {
      extra.cancelledReason = body.cancelledReason;
    }

    const updated = await updateOrderStatus(id, body.status, extra);

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Failed to update order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
