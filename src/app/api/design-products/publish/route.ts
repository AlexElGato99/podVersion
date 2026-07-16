import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getCatalogProductVariants,
  createPrintfulSyncProduct,
  uploadFileToPrintful,
  createMockupTask,
  pollMockupTask,
  getSyncProductPreviewUrl,
  sleep,
} from "@/lib/printful";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/design-products/publish
 * Body: { design_id, catalog_product_id }
 * Publishes (or re-publishes) one design+product combo.
 */
export async function POST(req: NextRequest) {
  const { design_id, catalog_product_id } = await req.json();
  if (!design_id || !catalog_product_id) {
    return NextResponse.json({ error: "design_id and catalog_product_id required" }, { status: 400 });
  }

  // Load design
  const { data: design, error: dErr } = await db
    .from("designs")
    .select("*")
    .eq("id", design_id)
    .single();
  if (dErr || !design) return NextResponse.json({ error: "Design not found" }, { status: 404 });

  // Load design-product config
  const { data: config, error: cErr } = await db
    .from("design_products")
    .select("*")
    .eq("design_id", design_id)
    .eq("catalog_product_id", catalog_product_id)
    .maybeSingle();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const selectedMockupUrl: string | null = config?.selected_mockup_url ?? null;

  // Determine variants, placement, price from config (fallback to template, then all variants)
  let variantIds: number[] = config?.selected_variant_ids ?? [];
  const placement   = config?.placement ?? "front";
  const price       = config?.default_price ?? "24.99";
  const positionData = config?.position_data as { width_pct?: number; left_pct?: number; top_pct?: number } | null;

  if (variantIds.length === 0) {
    // Fallback: load from product template
    const { data: tmpl } = await db
      .from("product_templates")
      .select("selected_variant_ids")
      .eq("catalog_product_id", catalog_product_id)
      .maybeSingle();
    variantIds = tmpl?.selected_variant_ids ?? [];
  }

  if (variantIds.length === 0) {
    // Last resort: use all catalog variants
    const variants = await getCatalogProductVariants(catalog_product_id);
    variantIds = (variants ?? []).map((v: { id: number }) => v.id);
  }

  if (variantIds.length === 0) {
    return NextResponse.json({ error: "No variants available for this product" }, { status: 400 });
  }

  // Upload design to Printful file library once
  let printfulFileId: number | undefined;
  let printfulPreviewUrl: string = design.url;
  try {
    const uploaded = await uploadFileToPrintful(design.url, design.name + ".png");
    printfulFileId = uploaded.id;
    printfulPreviewUrl = uploaded.preview_url ?? design.url;
  } catch {
    console.warn("[DesignPublish] Could not pre-upload design to Printful, falling back to URL");
  }

  // Build Printful position object from saved position_data
  const printfulPosition = positionData
    ? {
        area_width:  1800,
        area_height: 2400,
        width:  Math.round((positionData.width_pct ?? 0.8) * 1800),
        height: Math.round((positionData.width_pct ?? 0.8) * 1800),
        top:    Math.round((positionData.top_pct   ?? 0.05) * 2400),
        left:   Math.round((positionData.left_pct  ?? 0.1)  * 1800),
      }
    : undefined;

  const syncVariants = variantIds.map((id: number) => ({
    variant_id: id,
    retail_price: price,
    placement,
    ...(printfulFileId ? { fileId: printfulFileId } : { fileUrl: design.url }),
    ...(printfulPosition ? { position: printfulPosition } : {}),
  }));

  // Create Printful sync product
  const productName = `${design.name} — ${config?.catalog_product_name ?? `Product ${catalog_product_id}`}`;
  const { id: printfulProductId } = await createPrintfulSyncProduct({
    name: productName,
    thumbnail: printfulPreviewUrl,
    variants: syncVariants,
  });

  // Generate mockup thumbnail
  let thumbnailUrl: string | null = null;
  try {
    const { task_key } = await createMockupTask({
      catalogProductId: catalog_product_id,
      variantIds: variantIds.slice(0, 5),
      fileUrl: design.url,
      placement,
    });
    for (let i = 0; i < 20; i++) {
      await sleep(2000);
      const result = await pollMockupTask(task_key);
      if (result.status === "completed" && result.mockups.length > 0) {
        thumbnailUrl = result.mockups[0].mockup_url;
        break;
      }
      if (result.status === "failed") break;
    }
  } catch {
    // ignore mockup failure — fallback below
  }

  if (!thumbnailUrl) {
    thumbnailUrl = await getSyncProductPreviewUrl(printfulProductId, 20000);
  }
  if (!thumbnailUrl) thumbnailUrl = printfulPreviewUrl;

  // If admin selected a specific mockup, use it as the thumbnail
  const finalThumbnail = selectedMockupUrl ?? thumbnailUrl;

  const now = new Date().toISOString();

  // Upsert published_products
  await db.from("published_products").upsert({
    design_id: design.id,
    catalog_product_id,
    printful_sync_product_id: printfulProductId,
    name: productName,
    thumbnail_url: finalThumbnail,
    status: "published",
    published_at: now,
  }, { onConflict: "design_id,catalog_product_id" });

  // Write the mockup to product_settings so the shop/homepage picks it up immediately
  // product_settings is keyed by Printful sync product ID
  if (finalThumbnail) {
    await db.from("product_settings").upsert({
      id: printfulProductId,
      custom_mockup_url: finalThumbnail,
      updated_at: now,
    }, { onConflict: "id" });
  }

  // Update design_products config with published status
  await db
    .from("design_products")
    .update({
      printful_sync_product_id: printfulProductId,
      status: "published",
      published_at: now,
      updated_at: now,
    })
    .eq("design_id", design_id)
    .eq("catalog_product_id", catalog_product_id);

  return NextResponse.json({
    ok: true,
    printful_product_id: printfulProductId,
    thumbnail_url: finalThumbnail,
  });
}
