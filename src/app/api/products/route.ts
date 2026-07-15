import { NextRequest, NextResponse } from "next/server";
import { getProducts, getProduct } from "@/lib/printful";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  try {
    if (id) {
      const product = await getProduct(id);
      return NextResponse.json({ product });
    }
    const products = await getProducts();
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
