"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, BarChart3 } from "lucide-react";
import type { DashboardStats } from "@/lib/db/admin-queries";

function formatSEK(amount: number): string {
  return `${(amount / 100).toLocaleString("sv-SE")} SEK`;
}

export default function AdminSalesPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => {
        if (res.status === 401) {
          router.push("/admin/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Loading sales data...
      </div>
    );
  }

  if (!stats) {
    return <div className="text-red-500">Failed to load sales data.</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>

      {/* サマリー */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {formatSEK(stats.totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            From confirmed and completed reservations
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Total Reservations</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {stats.totalReservations}
          </p>
          <p className="mt-1 text-xs text-gray-400">All time</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Avg. Order Value</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {stats.totalReservations > 0
              ? formatSEK(
                  Math.round(stats.totalRevenue / (stats.confirmedReservations + stats.completedReservations || 1))
                )
              : "0 SEK"}
          </p>
          <p className="mt-1 text-xs text-gray-400">Per confirmed order</p>
        </div>
      </div>

      {/* 月別売上グラフ */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Monthly Sales</h2>
        </div>
        {stats.salesByMonth.length === 0 ? (
          <p className="text-sm text-gray-500">
            No sales data available yet.
          </p>
        ) : (
          <div className="space-y-3">
            {stats.salesByMonth.map((m) => {
              const maxTotal = Math.max(
                ...stats.salesByMonth.map((s) => s.total)
              );
              const widthPercent =
                maxTotal > 0 ? (m.total / maxTotal) * 100 : 0;
              return (
                <div key={m.month} className="flex items-center gap-4">
                  <span className="w-24 text-sm font-medium text-gray-600">
                    {m.month}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                      style={{ width: `${Math.max(widthPercent, 3)}%` }}
                    />
                  </div>
                  <div className="w-40 text-right">
                    <span className="text-sm font-bold text-gray-900">
                      {formatSEK(m.total)}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({m.count} orders)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* カテゴリ別売上 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">
            Sales by Category
          </h2>
        </div>
        {stats.salesByCategory.length === 0 ? (
          <p className="text-sm text-gray-500">
            No category sales data available yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.salesByCategory
              .sort((a, b) => b.total - a.total)
              .map((c) => (
                <div
                  key={c.category}
                  className="rounded-lg border border-gray-100 p-4"
                >
                  <p className="text-sm font-medium capitalize text-gray-500">
                    {c.category.replace(/-/g, " ")}
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {formatSEK(c.total)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {c.count} items sold
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 予約ステータス分布 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Reservation Status Distribution
        </h2>
        <div className="flex gap-4">
          {[
            { label: "Pending", count: stats.pendingReservations, color: "bg-yellow-400" },
            { label: "Confirmed", count: stats.confirmedReservations, color: "bg-blue-400" },
            { label: "Completed", count: stats.completedReservations, color: "bg-green-400" },
          ].map((item) => {
            const total =
              stats.pendingReservations +
              stats.confirmedReservations +
              stats.completedReservations;
            const widthPercent = total > 0 ? (item.count / total) * 100 : 33;
            return (
              <div key={item.label} className="flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-bold text-gray-900">
                    {item.count}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
