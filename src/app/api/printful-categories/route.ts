import { NextResponse } from "next/server";
import { getCatalogCategories } from "@/lib/printful";

export async function GET() {
  try {
    const categories = await getCatalogCategories();
    return NextResponse.json({ categories });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
