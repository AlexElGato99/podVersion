import { NextRequest, NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/printful";

// GET /api/catalog?limit=20&offset=0&category_id=...&search=...
export async function GET(req: NextRequest) {
  const limit       = parseInt(req.nextUrl.searchParams.get("limit")       ?? "24");
  const offset      = parseInt(req.nextUrl.searchParams.get("offset")      ?? "0");
  const category_id = req.nextUrl.searchParams.get("category_id");
  const search      = req.nextUrl.searchParams.get("search")?.toLowerCase();

  try {
    const { products, paging } = await getCatalogProducts({
      limit: Math.min(limit, 100),
      offset,
      category_id: category_id ? parseInt(category_id) : undefined,
    });

    const filtered = search
      ? products.filter((p: { name: string }) => p.name.toLowerCase().includes(search))
      : products;

    return NextResponse.json({ products: filtered, paging });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
