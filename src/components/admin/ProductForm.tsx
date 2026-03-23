"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Save } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, CONDITIONS, CONDITION_LABELS } from "@/lib/constants";
import type { Product } from "@/lib/db/schema";

interface ProductFormProps {
  product?: Product;
  mode: "create" | "edit";
}

export default function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nameEn, setNameEn] = useState(product?.nameEn || "");
  const [nameSv, setNameSv] = useState(product?.nameSv || "");
  const [descriptionEn, setDescriptionEn] = useState(product?.descriptionEn || "");
  const [descriptionSv, setDescriptionSv] = useState(product?.descriptionSv || "");
  const [price, setPrice] = useState(product ? String(product.price / 100) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "1");
  const [category, setCategory] = useState(product?.category || CATEGORIES[0]);
  const [condition, setCondition] = useState(product?.condition || CONDITIONS[0]);
  const [featured, setFeatured] = useState(product?.featured === 1);
  const [images, setImages] = useState<string[]>(
    product ? JSON.parse(product.images || "[]") : []
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      setError("Maximum 5 images allowed.");
      return;
    }

    setUploading(true);
    setError("");

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        return;
      }

      const data = await res.json();
      setImages((prev) => [...prev, ...data.paths]);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const priceInOre = Math.round(parseFloat(price) * 100);
    if (isNaN(priceInOre) || priceInOre < 0) {
      setError("Invalid price.");
      setSaving(false);
      return;
    }

    const body = {
      nameEn,
      nameSv,
      descriptionEn,
      descriptionSv,
      price: priceInOre,
      stock: parseInt(stock) || 0,
      category,
      condition,
      featured,
      images: JSON.stringify(images),
    };

    try {
      const url =
        mode === "create"
          ? "/api/admin/products"
          : `/api/admin/products/${product!.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save product.");
        return;
      }

      router.push("/admin/products");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 商品名 (EN/SV) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name (English) *
          </label>
          <input
            type="text"
            required
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name (Swedish) *
          </label>
          <input
            type="text"
            required
            value={nameSv}
            onChange={(e) => setNameSv(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
      </div>

      {/* 説明 (EN/SV) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description (English) *
          </label>
          <textarea
            required
            rows={4}
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description (Swedish) *
          </label>
          <textarea
            required
            rows={4}
            value={descriptionSv}
            onChange={(e) => setDescriptionSv(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
      </div>

      {/* 価格・在庫 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Price (SEK) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Stock *
          </label>
          <input
            type="number"
            required
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900"
            />
            <span className="text-sm font-medium text-gray-700">Featured</span>
          </label>
        </div>
      </div>

      {/* カテゴリ・コンディション */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category *
          </label>
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat].en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Condition *
          </label>
          <select
            required
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            {CONDITIONS.map((cond) => (
              <option key={cond} value={cond}>
                {CONDITION_LABELS[cond].en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 画像アップロード */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Images (max 5)
        </label>
        <div className="mt-2 flex flex-wrap gap-3">
          {images.map((img, index) => (
            <div
              key={index}
              className="relative h-24 w-24 rounded-lg border border-gray-200 bg-gray-50"
            >
              <img
                src={img}
                alt={`Product ${index + 1}`}
                className="h-full w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-500 disabled:opacity-50"
            >
              <Upload className="h-5 w-5" />
              <span className="mt-1 text-xs">
                {uploading ? "Uploading..." : "Upload"}
              </span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving
            ? "Saving..."
            : mode === "create"
              ? "Create Product"
              : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
