import { NextRequest, NextResponse } from "next/server";
import { pollMockupTask, sleep } from "@/lib/printful";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AUTH = () => ({
  Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
  "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID ?? "",
  "Content-Type": "application/json",
});

/**
 * POST /api/catalog/mockup
 * Body: { product_id, design_url, design_id?, placement? }
 *
 * Strategy 1: product already published → pull preview images from sync product (instant)
 * Strategy 2: use /mockup-generator/printfiles to get correct area, then run generator
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { product_id, design_url, design_id, placement } = body;

  if (!product_id || !design_url) {
    return NextResponse.json({ error: "product_id and design_url required" }, { status: 400 });
  }

  // ── Strategy 1: pull previews from an already-published sync product ──
  if (design_id) {
    try {
      const { data: dp } = await db
        .from("design_products")
        .select("printful_sync_product_id")
        .eq("design_id", design_id)
        .eq("catalog_product_id", Number(product_id))
        .maybeSingle();

      if (dp?.printful_sync_product_id) {
        const mockups = await fetchSyncProductPreviews(dp.printful_sync_product_id);
        if (mockups.length > 0) {
          return NextResponse.json({ mockups, source: "sync_product" });
        }
      }
    } catch { /* fall through to generator */ }
  }

  // ── Strategy 2: mockup generator ──
  // Use /mockup-generator/printfiles to get valid placements + exact pixel dimensions
  let placements: { placement_id: string; width: number; height: number }[] = [];
  try {
    const pfRes = await fetch(
      `https://api.printful.com/mockup-generator/printfiles/${product_id}`,
      { headers: AUTH(), cache: "no-store" as RequestCache }
    );
    if (pfRes.ok) {
      const pfData = await pfRes.json();
      // available_placements: { placement, print_area_width, print_area_height, ... }
      const available = pfData.result?.available_placements ?? {};
      // It's a map: { front: { width, height }, back: { width, height }, ... }
      for (const [key, val] of Object.entries(available as Record<string, { width: number; height: number }>)) {
        placements.push({ placement_id: key, width: val.width ?? 1800, height: val.height ?? 2400 });
      }
    }
  } catch { /* use empty */ }

  if (placements.length === 0) {
    return NextResponse.json({
      error: "Could not determine print placements for this product. Publish the product first to get auto-generated previews.",
    }, { status: 400 });
  }

  // Get variant IDs for this catalog product
  let variantIds: number[] = [];
  try {
    const vRes = await fetch(
      `https://api.printful.com/v2/catalog-products/${product_id}/catalog-variants?limit=10`,
      { headers: AUTH(), cache: "no-store" as RequestCache }
    );
    if (vRes.ok) {
      const vData = await vRes.json();
      variantIds = (vData.data ?? []).slice(0, 5).map((v: { id: number }) => v.id);
    }
  } catch { /* use empty */ }

  if (variantIds.length === 0) {
    return NextResponse.json({ error: "No variants found for this product" }, { status: 400 });
  }

  // Generate mockups for available placements (up to 4)
  const results: { url: string; placement: string }[] = [];
  const placementsToTry = placement
    ? [placements.find(p => p.placement_id === placement) ?? placements[0], ...placements.filter(p => p.placement_id !== placement)].slice(0, 4)
    : placements.slice(0, 4);

  for (const pl of placementsToTry) {
    const areaW = pl.width;
    const areaH = pl.height;
    const designW = Math.round(areaW * 0.85);
    const left = Math.round((areaW - designW) / 2);
    const top  = Math.round((areaH - designW) / 2);

    try {
      const taskRes = await fetch(
        `https://api.printful.com/mockup-generator/create-task/${product_id}`,
        {
          method: "POST",
          headers: AUTH(),
          body: JSON.stringify({
            variant_ids: variantIds,
            files: [{
              placement: pl.placement_id,
              image_url: design_url,
              position: {
                area_width:  areaW,
                area_height: areaH,
                width:  designW,
                height: designW,
                top,
                left,
              },
            }],
            format: "jpg",
          }),
        }
      );

      if (!taskRes.ok) continue;

      const taskData = await taskRes.json();
      const task_key = taskData.result?.task_key;
      if (!task_key) continue;

      for (let i = 0; i < 22; i++) {
        await sleep(2000);
        const result = await pollMockupTask(task_key);
        if (result.status === "completed") {
          for (const m of result.mockups) {
            results.push({ url: m.mockup_url, placement: m.placement });
          }
          break;
        }
        if (result.status === "failed") break;
      }
    } catch { /* skip placement */ }
  }

  if (results.length === 0) {
    return NextResponse.json({
      error: "Mockup generation failed. Publish the product first — Printful will auto-generate preview images you can then select here.",
    }, { status: 500 });
  }

  return NextResponse.json({ mockups: results, source: "generator" });
}

async function fetchSyncProductPreviews(syncProductId: number): Promise<{ url: string; placement: string }[]> {
  const res = await fetch(`https://api.printful.com/store/products/${syncProductId}`, {
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID ?? "",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const data = await res.json();
  const variants: { name: string; files?: { type: string; preview_url?: string }[] }[] =
    data.result?.sync_variants ?? [];

  const seen = new Set<string>();
  const mockups: { url: string; placement: string }[] = [];

  for (const v of variants) {
    for (const f of v.files ?? []) {
      if (f.type === "preview" && f.preview_url && !seen.has(f.preview_url)) {
        seen.add(f.preview_url);
        const parts = v.name.split(" / ").map((p: string) => p.trim());
        const label = parts.length >= 3 ? parts[parts.length - 2] : "Preview";
        mockups.push({ url: f.preview_url, placement: label });
      }
    }
  }

  const thumb: string = data.result?.sync_product?.thumbnail_url;
  if (thumb && !seen.has(thumb)) {
    mockups.unshift({ url: thumb, placement: "Thumbnail" });
  }

  return mockups;
}