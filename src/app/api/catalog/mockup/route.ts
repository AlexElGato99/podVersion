import { NextRequest, NextResponse } from "next/server";
import { createMockupTask, pollMockupTask, sleep } from "@/lib/printful";

/**
 * POST /api/catalog/mockup
 * Body: { product_id, design_url, placement, variant_ids }
 * Generates a mockup for a catalog product using the design URL and returns the mockup URLs.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { product_id, design_url, placement = "front", variant_ids } = body;

  if (!product_id || !design_url) {
    return NextResponse.json({ error: "product_id and design_url required" }, { status: 400 });
  }

  // If no variant_ids provided, fetch the first few for this catalog product
  let variantIds: number[] = variant_ids ?? [];
  if (variantIds.length === 0) {
    try {
      const res = await fetch(
        `https://api.printful.com/v2/catalog-products/${product_id}/catalog-variants?limit=10`,
        { headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` } }
      );
      if (res.ok) {
        const data = await res.json();
        variantIds = (data.data ?? []).slice(0, 5).map((v: { id: number }) => v.id);
      }
    } catch { /* use empty */ }
  }

  if (variantIds.length === 0) {
    return NextResponse.json({ error: "No variant IDs available for this product" }, { status: 400 });
  }

  try {
    const { task_key } = await createMockupTask({
      catalogProductId: Number(product_id),
      variantIds: variantIds.slice(0, 5),
      fileUrl: design_url,
      placement,
    });

    // Poll up to 40 seconds
    for (let i = 0; i < 20; i++) {
      await sleep(2000);
      const result = await pollMockupTask(task_key);
      if (result.status === "completed") {
        return NextResponse.json({
          mockups: result.mockups.map((m) => ({
            placement: m.placement,
            url: m.mockup_url,
          })),
        });
      }
      if (result.status === "failed") {
        return NextResponse.json({ error: "Mockup generation failed" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Mockup generation timed out" }, { status: 504 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
