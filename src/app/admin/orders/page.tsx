"use client";

import { useEffect, useState, useCallback } from "react";
import { formatPrice } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Package,
  RefreshCw,
  Loader2,
} from "lucide-react";
import type { Order, OrderItem } from "@/lib/db/schema";

type StatusFilter = "all" | "reserved" | "paid" | "cancelled" | "completed";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  reserved: {
    label: "Reserved",
    className: "bg-blue-100 text-blue-700",
  },
  pending_payment: {
    label: "Pending Payment",
    className: "bg-gray-100 text-gray-700",
  },
  paid: { label: "Paid", className: "bg-green-100 text-green-700" },
  shipped: { label: "Shipped", className: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
  payment_failed: {
    label: "Payment Failed",
    className: "bg-red-100 text-red-700",
  },
  cancellation_requested: {
    label: "Cancel Requested",
    className: "bg-orange-100 text-orange-700",
  },
};

function getRemainingDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders");
      if (res.ok) {
        const data = (await res.json()) as { orders: Order[] };
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function handleStatusChange(orderId: string, status: string) {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchOrders();
      } else {
        const data = (await res.json()) as { error: string };
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(orderId: string) {
    if (!confirm("Are you sure you want to cancel this reservation? Stock will be released.")) return;
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", cancelledReason: "admin" }),
      });
      if (res.ok) {
        await fetchOrders();
      } else {
        const data = (await res.json()) as { error: string };
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Failed to cancel order");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRefund(orderId: string) {
    if (!confirm("Are you sure you want to refund this order?")) return;
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchOrders();
      } else {
        const data = (await res.json()) as { error: string };
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Failed to refund order");
    } finally {
      setActionLoading(null);
    }
  }

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((o) => o.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <button
          onClick={() => { setLoading(true); fetchOrders(); }}
          className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* フィルター */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["reserved", "Reserved"],
            ["paid", "Paid"],
            ["completed", "Completed"],
            ["cancelled", "Cancelled"],
          ] as [StatusFilter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filter === key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
            {key !== "all" && (
              <span className="ml-1">
                ({orders.filter((o) => o.status === key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 注文一覧 */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No orders found.</p>
        ) : (
          filteredOrders.map((order) => {
            const items: OrderItem[] = JSON.parse(order.items);
            const badge = STATUS_BADGE[order.status] ?? {
              label: order.status,
              className: "bg-gray-100 text-gray-700",
            };
            const remaining = getRemainingDays(order.expiresAt);
            const isExpiringSoon =
              remaining !== null && remaining >= 0 && remaining <= 2;

            return (
              <div
                key={order.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-900">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {order.type === "inspection" ? (
                        <Eye className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Package className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {order.customerName} ({order.customerEmail})
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleString("en-SE")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(order.totalAmount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {items.map((i) => `${i.name_en} x${i.quantity}`).join(", ")}
                    </p>
                  </div>
                </div>

                {/* 期限表示 */}
                {order.type === "inspection" &&
                  order.status === "reserved" &&
                  order.expiresAt && (
                    <div
                      className={`mt-2 flex items-center gap-1 text-xs ${
                        isExpiringSoon
                          ? "font-medium text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>
                        Expires:{" "}
                        {new Date(order.expiresAt).toLocaleDateString("en-SE")}
                        {remaining !== null &&
                          remaining >= 0 &&
                          ` (${remaining} day${remaining !== 1 ? "s" : ""} left)`}
                        {remaining !== null &&
                          remaining < 0 &&
                          " (EXPIRED)"}
                      </span>
                    </div>
                  )}

                {/* アクションボタン */}
                <div className="mt-3 flex gap-2">
                  {/* reserved: Cancel (在庫仮押さえ解除) + Mark Completed (対面完了) */}
                  {order.status === "reserved" && (
                    <>
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={actionLoading === order.id}
                        className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Cancel Reservation
                      </button>
                    </>
                  )}

                  {/* paid: Mark Completed + Refund */}
                  {order.status === "paid" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(order.id, "completed")}
                        disabled={actionLoading === order.id}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        Mark Completed
                      </button>
                      {order.type === "delivery" && (
                        <button
                          onClick={() => handleRefund(order.id)}
                          disabled={actionLoading === order.id}
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                        >
                          {actionLoading === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Refund
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
