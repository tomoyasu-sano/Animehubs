"use client";

import ProductForm from "@/components/admin/ProductForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminNewProductPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
