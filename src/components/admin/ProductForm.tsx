"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Save, Upload, Loader2, Languages } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, CONDITIONS, CONDITION_LABELS } from "@/lib/constants";
import type { Product } from "@/lib/db/schema";

interface ProductFormProps {
  product?: Product;
  mode: "create" | "edit";
}

export default function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter();

  const [nameEn, setNameEn] = useState(product?.nameEn || "");
  const [nameSv, setNameSv] = useState(product?.nameSv || "");
  const [descriptionEn, setDescriptionEn] = useState(product?.descriptionEn || "");
  const [descriptionSv, setDescriptionSv] = useState(product?.descriptionSv || "");
  const [price, setPrice] = useState(product ? String(product.price / 100) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "1");
  const [category, setCategory] = useState(product?.category || CATEGORIES[0]);
  const [condition, setCondition] = useState(product?.condition || CONDITIONS[0]);
  const [heightCm, setHeightCm] = useState(product?.heightCm != null ? String(product.heightCm) : "");
  const [featured, setFeatured] = useState(product?.featured === 1);
  const [images, setImages] = useState<string[]>(
    product ? JSON.parse(product.images || "[]") : []
  );
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState("");

  const translateToSwedish = async () => {
    if (!nameEn && !descriptionEn) {
      setError("Enter English name or description first.");
      return;
    }
    setTranslating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameEn, description: descriptionEn }),
      });
      const data = (await res.json()) as {
        nameSv?: string;
        descriptionSv?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Translation failed.");
        return;
      }
      if (data.nameSv) setNameSv(data.nameSv);
      if (data.descriptionSv) setDescriptionSv(data.descriptionSv);
    } catch {
      setError("Translation failed. Please try again.");
    } finally {
      setTranslating(false);
    }
  };

  const addImageUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    if (images.length >= 5) {
      setError("Maximum 5 images allowed.");
      return;
    }
    try {
      new URL(url);
    } catch {
      setError("Invalid URL format.");
      return;
    }
    setImages((prev) => [...prev, url]);
    setImageUrl("");
    setError("");
  };

  const uploadFile = async (file: File) => {
    if (images.length >= 5) {
      setError("Maximum 5 images allowed.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }
      if (data.url) {
        setImages((prev) => [...prev, data.url!]);
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      uploadFile(files[i]);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      uploadFile(files[i]);
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
      heightCm: heightCm ? parseInt(heightCm) : null,
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
        const data = await res.json() as { error?: string };
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

      {/* 翻訳ボタン */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={translating || (!nameEn && !descriptionEn)}
          onClick={translateToSwedish}
          className="cursor-pointer flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-all hover:scale-[1.02] hover:bg-blue-100 disabled:opacity-50"
        >
          {translating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
          {translating ? "Translating..." : "Auto-translate EN → SV"}
        </button>
      </div>

      {/* 価格・Featured */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      {/* stock は一点物デフォルト(1)で非表示 */}
      <input type="hidden" value={stock} />

      {/* 高さ（任意） */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Height (cm)
        </label>
        <input
          type="number"
          min="1"
          step="1"
          value={heightCm}
          onChange={(e) => setHeightCm(e.target.value)}
          placeholder="e.g. 25"
          className="mt-1 block w-40 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
        <p className="mt-1 text-xs text-gray-400">Optional — shown on product page if set</p>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`Product ${index + 1}`}
                className="h-full w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="cursor-pointer absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white transition-all hover:scale-110 hover:bg-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {images.length < 5 && (
          <div className="mt-3 space-y-3">
            {/* ファイルアップロード（ドラッグ&ドロップ対応） */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 transition-colors hover:border-gray-400 hover:bg-gray-100"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
              <p className="mt-2 text-sm text-gray-500">
                {uploading ? "Uploading..." : "Drop images here or click to upload"}
              </p>
              <p className="mt-1 text-xs text-gray-400">JPEG, PNG, WebP, AVIF (max 5MB)</p>
              <input
                id="file-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* URL直接入力（代替手段） */}
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); } }}
                placeholder="Or paste image URL..."
                className="block flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
              <button
                type="button"
                onClick={addImageUrl}
                className="cursor-pointer flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:scale-[1.02] hover:bg-gray-200"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>
        )}
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
