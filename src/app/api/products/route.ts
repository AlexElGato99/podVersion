import { NextRequest, NextResponse } from "next/server";
import { getProducts, getProduct } from "@/lib/printful";
import { getPrintifyProducts, getPrintifyProduct, getPrintifyShopId, toPrintifyCommonProduct } from "@/lib/printify";
import { getStoreProducts } from "@/lib/products";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  try {
    // ── Single product detail ────────────────────────────────────────────
    if (id) {
      if (id.startsWith("printify_")) {
        const shopId = await getPrintifyShopId();
        const product = await getPrintifyProduct(shopId, id.replace("printify_", ""));
        return NextResponse.json({ product, _source: "printify" });
      }
      // Default: Printful
      const product = await getProduct(id);
      return NextResponse.json({ product, _source: "printful" });
    }

    // ── Product list ─────────────────────────────────────────────────────
    const products = await getStoreProducts();

    return NextResponse.json({ products });
  } catch (error) {
    console.error("[api/products]", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

