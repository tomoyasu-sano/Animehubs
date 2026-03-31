"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Reservation } from "@/lib/db/schema";

function formatSEK(amount: number): string {
  return `${(amount / 100).toLocaleString("sv-SE")} SEK`;
}

const STATUS_OPTIONS = ["", "pending", "confirmed", "completed", "cancelled"];
const STATUS_LABELS: Record<string, string> = {
  "": "All Statuses",
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// 許可された状態遷移
const NEXT_STATUS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export default function AdminReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/admin/reservations?${params}`);
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json() as { items: Reservation[]; total: number };
      setReservations(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch reservations:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, router]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const updated = await res.json() as Reservation;
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? updated : r))
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(null);
    }
  };

  const parseItems = (
    itemsJson: string
  ): { productId: string; nameEn: string; nameSv: string; quantity: number; price: number }[] => {
    try {
      return JSON.parse(itemsJson);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Reservations ({total})
        </h1>
      </div>

      {/* フィルター */}
      <div className="flex gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* テーブル */}
      {loading ? (
        <div className="flex h-32 items-center justify-center text-gray-500">
          Loading...
        </div>
      ) : reservations.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-gray-500">
          No reservations found.
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((reservation) => {
            const items = parseItems(reservation.items);
            const isExpanded = expandedId === reservation.id;
            const nextStatuses = NEXT_STATUS[reservation.status] || [];

            return (
              <div
                key={reservation.id}
                className="rounded-xl bg-white shadow-sm"
              >
                {/* ヘッダー行 */}
                <div
                  className="flex cursor-pointer items-center justify-between p-4"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : reservation.id)
                  }
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {reservation.customerName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {reservation.customerEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">
                      {formatSEK(reservation.totalAmount)}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[reservation.status] || "bg-gray-100 text-gray-700"}`}
                    >
                      {reservation.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(reservation.createdAt).toLocaleDateString()}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* 詳細 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          Details
                        </h4>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Location:</span>{" "}
                          {reservation.location}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Time Slot:</span>{" "}
                          {reservation.timeSlot}
                        </p>
                        {reservation.notes && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span>{" "}
                            {reservation.notes}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Created:</span>{" "}
                          {new Date(reservation.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          Items
                        </h4>
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm text-gray-600"
                          >
                            <span>
                              {item.nameEn} x{item.quantity}
                            </span>
                            <span>{formatSEK(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ステータス更新ボタン */}
                    {nextStatuses.length > 0 && (
                      <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
                        <span className="text-sm text-gray-500">
                          Update status:
                        </span>
                        {nextStatuses.map((status) => (
                          <button
                            key={status}
                            onClick={() =>
                              handleStatusUpdate(reservation.id, status)
                            }
                            disabled={updating === reservation.id}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                              status === "cancelled"
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            }`}
                          >
                            {updating === reservation.id
                              ? "Updating..."
                              : status.charAt(0).toUpperCase() +
                                status.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
