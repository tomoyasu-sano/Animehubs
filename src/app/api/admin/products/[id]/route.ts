import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  updateProduct,
  deleteProduct,
  getFeaturedCount,
  getMaxFeaturedOrder,
} from "@/lib/db/admin-queries";
import { getProductById } from "@/lib/db/queries";
import { validateUpdateProduct } from "@/lib/admin-validation";

const MAX_FEATURED = 20;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Admin product GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;

    const errors = validateUpdateProduct(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
    }

    const currentProduct = await getProductById(id);
    if (!currentProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.nameEn !== undefined) updateData.nameEn = body.nameEn;
    if (body.nameSv !== undefined) updateData.nameSv = body.nameSv;
    if (body.descriptionEn !== undefined) updateData.descriptionEn = body.descriptionEn;
    if (body.descriptionSv !== undefined) updateData.descriptionSv = body.descriptionSv;
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.stock !== undefined) updateData.stock = Number(body.stock);
    if (body.category !== undefined) updateData.category = body.category;
    if (body.condition !== undefined) updateData.condition = body.condition;
    if (body.heightCm !== undefined) updateData.heightCm = body.heightCm != null ? Number(body.heightCm) : null;
    if (body.images !== undefined) updateData.images = body.images;
    if (body.featured !== undefined) {
      const newFeatured = body.featured ? 1 : 0;
      updateData.featured = newFeatured;

      // Featured 0→1: 末尾に配置 + 上限チェック
      if (currentProduct.featured === 0 && newFeatured === 1) {
        const count = await getFeaturedCount();
        if (count >= MAX_FEATURED) {
          return NextResponse.json(
            {
              error: "Validation failed",
              details: [`Maximum ${MAX_FEATURED} featured products allowed`],
            },
            { status: 400 }
          );
        }
        updateData.featuredOrder = (await getMaxFeaturedOrder()) + 1;
      }

      // Featured 1→0: リセット
      if (currentProduct.featured === 1 && newFeatured === 0) {
        updateData.featuredOrder = 0;
      }
    }

    const product = await updateProduct(id, updateData);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Admin product PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await deleteProduct(id);
    if (!deleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Admin product DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
