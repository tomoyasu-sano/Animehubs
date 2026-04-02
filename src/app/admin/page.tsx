"use client";

import { useEffect, useState } from "react";
import type { DashboardStats } from "@/lib/db/admin-queries";

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{title}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function formatSEK(amount: number): string {
  return `${(amount / 100).toLocaleString("sv-SE")} SEK`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    pending_payment: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    paid: "bg-blue-100 text-blue-700",
    shipped: "bg-indigo-100 text-indigo-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    payment_failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<DashboardStats>;
      })
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-red-500">Failed to load dashboard data.</div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Products" value={stats.totalProducts} />
        <StatCard title="Orders" value={stats.totalOrders} />
        <StatCard title="Reservations" value={stats.totalReservations} />
        <StatCard title="Revenue" value={formatSEK(stats.totalRevenue)} />
      </div>

      {/* 注文ステータスサマリー */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 注文ステータス */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Order Status
          </h2>
          <div className="space-y-3">
            {[
              { label: "Pending Payment", value: stats.pendingOrders, dot: "bg-yellow-400" },
              { label: "Paid", value: stats.paidOrders, dot: "bg-blue-400" },
              { label: "Shipped", value: stats.shippedOrders, dot: "bg-indigo-400" },
              { label: "Completed", value: stats.completedOrders, dot: "bg-green-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 最近の注文 */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Orders
          </h2>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {o.orderNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {o.customerName} &middot; {new Date(o.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">
                      {formatSEK(o.totalAmount)}
                    </span>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* レガシー予約（データがある場合のみ表示） */}
      {stats.totalReservations > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Legacy Reservations
            </h2>
            <div className="space-y-3">
              {[
                { label: "Pending", value: stats.pendingReservations, dot: "bg-yellow-400" },
                { label: "Confirmed", value: stats.confirmedReservations, dot: "bg-blue-400" },
                { label: "Completed", value: stats.completedReservations, dot: "bg-green-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Recent Reservations
            </h2>
            {stats.recentReservations.length === 0 ? (
              <p className="text-sm text-gray-500">No reservations.</p>
            ) : (
              <div className="space-y-3">
                {stats.recentReservations.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {r.customerName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">
                        {formatSEK(r.totalAmount)}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 月別売上 */}
      {stats.salesByMonth.length > 0 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Monthly Sales
          </h2>
          <div className="space-y-2">
            {stats.salesByMonth.map((m) => {
              const maxTotal = Math.max(
                ...stats.salesByMonth.map((s) => s.total)
              );
              const widthPercent = maxTotal > 0 ? (m.total / maxTotal) * 100 : 0;
              return (
                <div key={m.month} className="flex items-center gap-4">
                  <span className="w-20 text-sm text-gray-500">{m.month}</span>
                  <div className="flex-1">
                    <div
                      className="h-5 rounded bg-gray-800"
                      style={{ width: `${Math.max(widthPercent, 2)}%` }}
                    />
                  </div>
                  <span className="w-32 text-right text-sm font-medium text-gray-700">
                    {formatSEK(m.total)} ({m.count})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* カテゴリ別売上 */}
      {stats.salesByCategory.length > 0 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Sales by Category
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.salesByCategory.map((c) => (
              <div
                key={c.category}
                className="rounded-lg border border-gray-100 p-4"
              >
                <p className="text-sm font-medium capitalize text-gray-900">
                  {c.category.replace(/-/g, " ")}
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {formatSEK(c.total)}
                </p>
                <p className="text-xs text-gray-500">{c.count} items sold</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
