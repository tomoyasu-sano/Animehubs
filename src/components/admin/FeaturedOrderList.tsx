"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2 } from "lucide-react";
import type { Product } from "@/lib/db/schema";
import { parseImages } from "@/lib/utils";

function formatSEK(amount: number): string {
  return `${(amount / 100).toLocaleString("sv-SE")} SEK`;
}

interface SortableItemProps {
  product: Product;
  index: number;
}

function SortableItem({ product, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const images = parseImages(product.images);
  const thumbnail = images[0] || "/placeholder/no-image.svg";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 rounded-lg border bg-white px-4 py-3 ${
        isDragging ? "z-50 shadow-lg opacity-90" : "shadow-sm"
      }`}
    >
      <button
        className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <span className="w-6 text-center text-sm font-medium text-gray-500">
        {index + 1}
      </span>

      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
        <Image
          src={thumbnail}
          alt={product.nameEn}
          fill
          className="object-cover"
          sizes="48px"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {product.nameEn}
        </p>
      </div>

      <span className="flex-shrink-0 text-sm font-semibold text-gray-700">
        {formatSEK(product.price)}
      </span>
    </div>
  );
}

export default function FeaturedOrderList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasChanges =
    JSON.stringify(products.map((p) => p.id)) !==
    JSON.stringify(originalOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/featured-order");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = (await res.json()) as { items: Product[] };
      setProducts(data.items);
      setOriginalOrder(data.items.map((p) => p.id));
    } catch {
      setError("Failed to load featured products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ページ離脱警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setProducts((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setSuccess("");
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const items = products.map((p, i) => ({ id: p.id, order: i + 1 }));

      const res = await fetch("/api/admin/featured-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { details?: string[] };
        throw new Error(data.details?.[0] || "Failed to save");
      }

      setOriginalOrder(products.map((p) => p.id));
      setSuccess("Order saved successfully");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save order. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-gray-500">
          No featured products. Mark products as featured in the Products page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={products.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {products.map((product, index) => (
              <SortableItem
                key={product.id}
                product={product}
                index={index}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
          {success}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors ${
            hasChanges
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Order
        </button>

        {hasChanges && (
          <span className="text-sm text-amber-600">Unsaved changes</span>
        )}
      </div>

      <p className="text-xs text-gray-500">
        ※ トップページには上位6件が表示されます
      </p>
    </div>
  );
}
