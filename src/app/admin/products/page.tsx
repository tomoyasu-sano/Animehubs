"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2, PackageX, PackageCheck } from "lucide-react";
import type { Product } from "@/lib/db/schema";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants";

function formatSEK(amount: number): string {
  return `${(amount / 100).toLocaleString("sv-SE")} SEK`;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [soldTarget, setSoldTarget] = useState<Product | null>(null);
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Mark as Sold ダイアログの入力（SEK文字列）
  const [saleChannel, setSaleChannel] = useState<"site" | "vinted" | "other">("vinted");
  const [salePrice, setSalePrice] = useState("");
  const [saleFee, setSaleFee] = useState("");
  const [saleShipping, setSaleShipping] = useState("");

  const openSoldDialog = (product: Product) => {
    setSaleChannel("vinted");
    setSalePrice(String(product.price / 100));
    setSaleFee("");
    setSaleShipping("");
    setSoldTarget(product);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category) params.set("category", category);

    try {
      setError("");
      const res = await fetch(`/api/admin/products?${params}`);
      if (!res.ok) {
        setError("Failed to load products.");
        return;
      }
      const data = await res.json() as { items: Product[]; total: number };
      setProducts(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== deleteId));
        setTotal((prev) => prev - 1);
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
    } finally {
      setDeleteId(null);
      setDeleting(false);
    }
  };

  const updateStock = async (productId: string, stock: number) => {
    setUpdatingStockId(productId);
    try {
      setError("");
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock }),
      });
      if (!res.ok) {
        setError("Failed to update stock.");
        return;
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock } : p))
      );
    } catch {
      setError("Failed to update stock.");
    } finally {
      setUpdatingStockId(null);
    }
  };

  const handleMarkSold = async () => {
    if (!soldTarget) return;
    const target = soldTarget;
    const priceOre = Math.round(parseFloat(salePrice) * 100);
    if (isNaN(priceOre) || priceOre < 0) {
      setError("Invalid sale price.");
      return;
    }
    const feeOre = saleFee ? Math.round(parseFloat(saleFee) * 100) : 0;
    const shippingOre = saleShipping ? Math.round(parseFloat(saleShipping) * 100) : 0;

    setSoldTarget(null);
    setUpdatingStockId(target.id);
    try {
      const res = await fetch("/api/admin/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: target.id,
          nameEn: target.nameEn,
          channel: saleChannel,
          soldPrice: priceOre,
          costSek: target.costSek ?? null,
          sellerFee: feeOre,
          sellerShipping: shippingOre,
        }),
      });
      if (!res.ok) {
        setError("Failed to record sale.");
        return;
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === target.id ? { ...p, stock: 0 } : p)),
      );
    } catch {
      setError("Failed to record sale.");
    } finally {
      setUpdatingStockId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Products ({total})
        </h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* フィルター */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat].en}
            </option>
          ))}
        </select>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* テーブル */}
      {loading ? (
        <div className="flex h-32 items-center justify-center text-gray-500">
          Loading...
        </div>
      ) : products.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-gray-500">
          No products found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Image
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Category
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Price
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Cost / Margin
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Stock
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Featured
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                let images: string[] = [];
                try { images = JSON.parse(product.images || "[]"); } catch { /* invalid JSON */ }
                return (
                  <tr
                    key={product.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="h-10 w-10 rounded-lg bg-gray-200">
                        {images[0] && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={images[0]}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {product.nameEn}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700">
                        {CATEGORY_LABELS[product.category as Category]?.en || product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {formatSEK(product.price)}
                    </td>
                    <td className="px-4 py-3">
                      {product.costSek != null ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-gray-900">
                            {formatSEK(product.costSek)}
                          </span>
                          <span className="text-xs font-medium text-green-600">
                            +{formatSEK(product.price - product.costSek)}
                            {product.price > 0
                              ? ` (${Math.round(((product.price - product.costSek) / product.price) * 100)}%)`
                              : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-medium ${product.stock === 0 ? "text-red-600" : "text-gray-900"}`}
                      >
                        {product.stock === 0 ? "Sold out" : product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {product.featured ? (
                        <span className="text-yellow-500">&#9733;</span>
                      ) : (
                        <span className="text-gray-300">&#9734;</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        {product.stock === 0 ? (
                          <button
                            onClick={() => updateStock(product.id, 1)}
                            disabled={updatingStockId === product.id}
                            title="Restock (set stock to 1)"
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                          >
                            <PackageCheck className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openSoldDialog(product)}
                            disabled={updatingStockId === product.id}
                            title="Mark as Sold"
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                          >
                            <PackageX className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteId(product.id)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sold記録ダイアログ（チャネル・実売価格・利益プレビュー） */}
      {soldTarget &&
        (() => {
          const priceOre = Math.round((parseFloat(salePrice) || 0) * 100);
          const feeOre = Math.round((parseFloat(saleFee) || 0) * 100);
          const shippingOre = Math.round((parseFloat(saleShipping) || 0) * 100);
          const cost = soldTarget.costSek;
          const profit = priceOre - (cost ?? 0) - feeOre - shippingOre;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900">
                  Mark as Sold
                </h3>
                <p className="mt-1 text-sm text-gray-500">{soldTarget.nameEn}</p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Channel
                    </label>
                    <select
                      value={saleChannel}
                      onChange={(e) =>
                        setSaleChannel(e.target.value as "site" | "vinted" | "other")
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    >
                      <option value="vinted">Vinted</option>
                      <option value="site">Site (Stripe)</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">
                        Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">
                        Fee
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={saleFee}
                        onChange={(e) => setSaleFee(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">
                        Shipping
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={saleShipping}
                        onChange={(e) => setSaleShipping(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Vinted は手数料・送料とも買い手負担のため通常 0。単位は SEK。
                  </p>

                  {/* 利益プレビュー */}
                  <div className="rounded-lg bg-gray-50 p-3 text-sm">
                    {cost == null ? (
                      <p className="text-amber-600">
                        原価未設定。先に商品編集で Cost を入れると利益が出ます（今は売値=利益扱い）。
                      </p>
                    ) : (
                      <p className="text-gray-600">
                        原価 {formatSEK(cost)} →{" "}
                        <span className="font-semibold text-green-600">
                          純利益 {formatSEK(profit)}
                        </span>{" "}
                        <span className="text-gray-400">
                          / 友達分 {formatSEK(Math.round(profit / 2))}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    onClick={() => setSoldTarget(null)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMarkSold}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                  >
                    Record Sale
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* 削除確認ダイアログ */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Product
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
