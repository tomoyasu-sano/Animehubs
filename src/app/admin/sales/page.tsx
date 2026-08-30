"use client";

import { useEffect, useState } from "react";
import { TrendingUp, BarChart3 } from "lucide-react";
import type { DashboardStats, SalesSummary } from "@/lib/db/admin-queries";
import { CATEGORY_LABELS, type Category } from "@/lib/constants";

const CHANNEL_LABELS: Record<string, string> = {
  site: "Site",
  vinted: "Vinted",
  other: "Other",
};

function formatSEK(amount: number): string {
  return `${(amount / 100).toLocaleString("sv-SE")} SEK`;
}

export default function AdminSalesPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ledger, setLedger] = useState<SalesSummary | null>(null);
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

    fetch("/api/admin/sales")
      .then((res) => (res.ok ? (res.json() as Promise<SalesSummary>) : null))
      .then((data) => {
        if (data) setLedger(data);
      })
      .catch(console.error);
  }, []);

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

  const totalPaidCount =
    stats.paidOrders + stats.shippedOrders + stats.completedOrders +
    stats.confirmedReservations + stats.completedReservations +
    stats.channelSalesCount;

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
            サイト注文・予約 + 全チャネル売却（Vinted等）を合算
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {stats.totalOrders + stats.totalReservations + stats.channelSalesCount}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {stats.totalOrders} orders + {stats.totalReservations} reservations +{" "}
            {stats.channelSalesCount} channel sales
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Avg. Order Value</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {totalPaidCount > 0
              ? formatSEK(Math.round(stats.totalRevenue / totalPaidCount))
              : "0 SEK"}
          </p>
          <p className="mt-1 text-xs text-gray-400">Per paid order / sale</p>
        </div>
      </div>

      {/* 利益台帳（原価ベース・全チャネル） */}
      {ledger && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">
              Profit Ledger（原価ベース・全チャネル）
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">売上（販売価格）</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatSEK(ledger.totalRevenue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">原価</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatSEK(ledger.totalCost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">純利益</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {formatSEK(ledger.totalProfit)}
              </p>
              <p className="text-xs text-gray-400">売上 − 原価 − 手数料</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">売却数</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {ledger.totalCount}
              </p>
            </div>
          </div>

          {/* 精算（1回目 = 売上折半） */}
          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-4">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <div>
                <span className="text-xs text-gray-500">
                  友達へ Swish（売上の50%）
                </span>
                <span className="ml-2 text-2xl font-bold text-amber-700">
                  {formatSEK(ledger.revenueSplit)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                参考: 利益の50% ={" "}
                <span className="font-medium text-gray-700">
                  {formatSEK(ledger.friendShare)}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              1回目の輸入は仕入コストを現地2人で折半済みのため、精算は<b>売上を50/50</b>
              （＝各自の元手回収 ＋ 利益折半 と等価）。
            </p>
          </div>

          {ledger.byChannel.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium text-gray-500">
                チャネル別
              </h3>
              <div className="space-y-1">
                {ledger.byChannel.map((c) => (
                  <div
                    key={c.channel}
                    className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm"
                  >
                    <span className="font-medium text-gray-700">
                      {CHANNEL_LABELS[c.channel] || c.channel}
                      <span className="ml-2 text-xs text-gray-400">
                        {c.count} 点
                      </span>
                    </span>
                    <span className="text-gray-600">
                      売上 {formatSEK(c.revenue)}
                      <span className="ml-3 font-semibold text-green-600">
                        利益 {formatSEK(c.profit)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ledger.recent.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium text-gray-500">
                直近の売却
              </h3>
              <div className="space-y-1">
                {ledger.recent.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm"
                  >
                    <span className="truncate pr-3 text-gray-700">
                      {s.nameEn}
                      <span className="ml-2 text-xs text-gray-400">
                        {CHANNEL_LABELS[s.channel] || s.channel}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-gray-600">
                      販売 {formatSEK(s.soldPrice)}
                      {s.costSek != null && (
                        <span className="text-gray-400">
                          {" "}− 原価 {formatSEK(s.costSek)}
                        </span>
                      )}
                      <span className="ml-2 font-semibold text-green-600">
                        = 利益 {formatSEK(s.profit)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
                  <p className="text-sm font-medium text-gray-500">
                    {CATEGORY_LABELS[c.category as Category]?.en || c.category}
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

      {/* 注文ステータス分布 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Order Status Distribution
        </h2>
        <div className="flex gap-4">
          {[
            { label: "Pending", count: stats.pendingOrders, color: "bg-yellow-400" },
            { label: "Paid", count: stats.paidOrders, color: "bg-blue-400" },
            { label: "Shipped", count: stats.shippedOrders, color: "bg-indigo-400" },
            { label: "Completed", count: stats.completedOrders, color: "bg-green-400" },
          ].map((item) => {
            const total =
              stats.pendingOrders + stats.paidOrders + stats.shippedOrders + stats.completedOrders;
            const widthPercent = total > 0 ? (item.count / total) * 100 : 25;
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
