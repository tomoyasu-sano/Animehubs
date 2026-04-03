"use client";

import { useTranslations } from "next-intl";

const STATUS_COLORS: Record<string, string> = {
  reserved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  pending_payment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  payment_failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const STATUS_KEYS: Record<string, string> = {
  reserved: "statusReserved",
  pending_payment: "statusPendingPayment",
  paid: "statusPaid",
  shipped: "statusShipped",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
  payment_failed: "statusPaymentFailed",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslations("orderDetail");
  const color = STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
  const key = STATUS_KEYS[status];
  const label = key ? t(key as Parameters<typeof t>[0]) : status;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color} ${className || ""}`}>
      {label}
    </span>
  );
}
