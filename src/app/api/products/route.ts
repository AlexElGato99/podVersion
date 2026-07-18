import { NextRequest, NextResponse } from "next/server";
import { getProducts, getProduct } from "@/lib/printful";
import { getPrintifyProducts, getPrintifyProduct, getPrintifyShopId, toPrintifyCommonProduct } from "@/lib/printify";
import { getSettingsSection } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  try {
    const general = await getSettingsSection("general");
    const provider = (general.pod_provider ?? "printful").toLowerCase();

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
    const usePrintful  = provider === "printful"  || provider === "both";
    const usePrintify  = provider === "printify"  || provider === "both";

    const [printfulProducts, printifyProducts] = await Promise.all([
      usePrintful  ? getProducts()          : Promise.resolve([]),
      usePrintify  ? getPrintifyProducts()  : Promise.resolve([]),
    ]);

    const products = [
      ...printfulProducts.map((p) => ({ ...p, _source: "printful" as const })),
      ...printifyProducts.map(toPrintifyCommonProduct),
    ];

    return NextResponse.json({ products });
  } catch (error) {
    console.error("[api/products]", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

