import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getCatalogProductVariants,
  getCatalogProductPrintfiles,
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

// GET /api/publish?jobId=xxx — poll job progress
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const { data, error } = await db
    .from("publish_jobs")
    .select("*, publish_job_items(id, catalog_product_id, catalog_product_name, status, error, printful_product_id, created_at)")
    .eq("id", jobId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data });
}

// POST /api/publish — start a publish job
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { design_id, collection_id, preset_id } = body;

  if (!design_id || !collection_id) {
    return NextResponse.json({ error: "design_id and collection_id required" }, { status: 400 });
  }

  // Load design
  const { data: design, error: dErr } = await db
    .from("designs")
    .select("*")
    .eq("id", design_id)
    .single();
  if (dErr || !design) return NextResponse.json({ error: "Design not found" }, { status: 404 });

  // Load collection with its products
  const { data: collection, error: cErr } = await db
    .from("collections")
    .select("*, collection_products(*)")
    .eq("id", collection_id)
    .single();
  if (cErr || !collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

  const collectionProducts = (collection.collection_products ?? []).filter(
    (cp: { is_enabled: boolean }) => cp.is_enabled !== false
  );

  if (collectionProducts.length === 0) {
    return NextResponse.json({ error: "Collection has no enabled products" }, { status: 400 });
  }

  // Create job record
  const { data: job, error: jobErr } = await db
    .from("publish_jobs")
    .insert({
      design_id,
      collection_id,
      total: collectionProducts.length,
      completed: 0,
      failed: 0,
      status: "running",
    })
    .select("id")
    .single();

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 });

  // Create job items (one per catalog product)
  await db.from("publish_job_items").insert(
    collectionProducts.map((cp: { catalog_product_id: number; catalog_product_name: string }) => ({
      job_id: job.id,
      catalog_product_id: cp.catalog_product_id,
      catalog_product_name: cp.catalog_product_name,
      status: "pending",
    }))
  );

  // Load mockup preset (optional) — overrides template/collection variant selections
  let presetProducts: { catalog_product_id: number; selected_variant_ids: number[]; placement: string; default_price: string }[] = [];
  if (preset_id) {
    const { data: preset } = await db
      .from("mockup_presets")
      .select("products")
      .eq("id", preset_id)
      .single();
    presetProducts = preset?.products ?? [];
  }

  // Run publishing in background (fire-and-forget from Next.js perspective)
  // We return jobId immediately, then the background loop runs
  runPublishJob(job.id, design, collectionProducts, presetProducts).catch(console.error);

  return NextResponse.json({ jobId: job.id });
}

async function runPublishJob(
  jobId: string,
  design: { id: string; name: string; url: string; tags?: string },
  collectionProducts: { catalog_product_id: number; catalog_product_name: string; placement?: string; default_price?: string; selected_variant_ids?: number[] }[],
  presetProducts: { catalog_product_id: number; selected_variant_ids: number[]; placement: string; default_price: string }[] = []
) {
  let completed = 0;
  let failed = 0;

  // Build preset map (highest priority for variant/placement overrides)
  const presetMap = new Map(
    presetProducts.map((p) => [p.catalog_product_id, p])
  );

  // Load saved product templates to use as defaults
  const { data: templates } = await db
    .from("product_templates")
    .select("catalog_product_id, selected_variant_ids, placement, default_price, thumbnail_placement")
    .in("catalog_product_id", collectionProducts.map((cp) => cp.catalog_product_id));
  const templateMap = new Map(
    (templates ?? []).map((t: { catalog_product_id: number; selected_variant_ids: number[]; placement: string; default_price: string; thumbnail_placement?: string }) =>
      [t.catalog_product_id, t]
    )
  );

  // Upload design file to Printful's file library ONCE — reuse the file ID across all products
  let printfulFileId: number | undefined;
  let printfulPreviewUrl: string = design.url;
  try {
    const uploaded = await uploadFileToPrintful(design.url, design.name + ".png");
    printfulFileId = uploaded.id;
    printfulPreviewUrl = uploaded.preview_url ?? design.url;
  } catch (e) {
    // If upload fails, fall back to URL-based file (mockups may not generate)
    console.warn("[PublishJob] Could not pre-upload design to Printful:", e);
  }

  for (const cp of collectionProducts) {
    const itemFilter = {
      job_id: jobId,
      catalog_product_id: cp.catalog_product_id,
    };

    try {
      // Mark as running
      await db.from("publish_job_items").update({ status: "running" }).match(itemFilter);

      // Check for duplicate (already published this design on this catalog product)
      const { data: existing } = await db
        .from("published_products")
        .select("id")
        .eq("design_id", design.id)
        .eq("catalog_product_id", cp.catalog_product_id)
        .single();

      if (existing) {
        await db.from("publish_job_items").update({
          status: "skipped",
          error: "Already published",
        }).match(itemFilter);
        completed++;
        await db.from("publish_jobs").update({ completed }).eq("id", jobId);
        continue;
      }

      // Determine which variant IDs to use
      // Priority: collection product selection > saved template > all variants
      const preset   = presetMap.get(cp.catalog_product_id) as { selected_variant_ids?: number[]; placement?: string; default_price?: string } | undefined;
      const template = templateMap.get(cp.catalog_product_id) as { selected_variant_ids?: number[]; placement?: string; default_price?: string; thumbnail_placement?: string } | undefined;
      const cpAny    = cp as { selected_variant_ids?: number[] };

      let variantIds: number[];
      let effectivePlacement   = preset?.placement ?? cp.placement ?? template?.placement ?? "front";
      let effectivePrice       = preset?.default_price ?? cp.default_price ?? template?.default_price ?? "24.99";
      const thumbnailPlacement = template?.thumbnail_placement ?? effectivePlacement;

      // Priority: preset > collection product selection > saved template > all variants
      if (preset?.selected_variant_ids && preset.selected_variant_ids.length > 0) {
        variantIds = preset.selected_variant_ids;
      } else if (cpAny.selected_variant_ids && cpAny.selected_variant_ids.length > 0) {
        variantIds = cpAny.selected_variant_ids;
      } else if (template?.selected_variant_ids && template.selected_variant_ids.length > 0) {
        variantIds = template.selected_variant_ids;
      } else {
        // No selection anywhere — fetch all variants for this catalog product
        const variants = await getCatalogProductVariants(cp.catalog_product_id);
        if (!variants || variants.length === 0) throw new Error("No variants found for catalog product");
        variantIds = variants.map((v: { id: number }) => v.id);
      }

      // Get placement from printfiles if not set
      if (effectivePlacement === "front") {
        const printfiles = await getCatalogProductPrintfiles(cp.catalog_product_id);
        effectivePlacement = printfiles?.placements?.[0]?.placement_id ?? "front";
      }

      // Build Printful position from design's saved position_data
      const pd = design.position_data as { width_pct?: number; left_pct?: number; top_pct?: number } | null | undefined;
      const printfulPosition = pd
        ? {
            area_width:  1800,
            area_height: 2400,
            width:  Math.round((pd.width_pct ?? 0.8) * 1800),
            height: Math.round((pd.width_pct ?? 0.8) * 1800), // Printful derives height from image ratio
            top:    Math.round((pd.top_pct  ?? 0.05) * 2400),
            left:   Math.round((pd.left_pct ?? 0.1)  * 1800),
          }
        : undefined;

      const syncVariants = variantIds.map((id: number) => ({
        variant_id: id,
        retail_price: effectivePrice,
        placement: effectivePlacement,
        ...(printfulFileId ? { fileId: printfulFileId } : { fileUrl: design.url }),
        ...(printfulPosition ? { position: printfulPosition } : {}),
      }));

      // Create product in Printful
      const productName = `${design.name} — ${cp.catalog_product_name}`;
      const { id: printfulProductId } = await createPrintfulSyncProduct({
        name: productName,
        thumbnail: printfulPreviewUrl,
        variants: syncVariants,
      });

      // Generate mockup & get real product preview thumbnail
      // Step 1: try mockup generator (gives the best design-on-product image)
      let mockupUrl: string | null = null;
      try {
        const { task_key } = await createMockupTask({
          catalogProductId: cp.catalog_product_id,
          variantIds: variantIds.slice(0, 5),
          fileUrl: design.url,
          placement: thumbnailPlacement,
        });
        for (let i = 0; i < 20; i++) {
          await sleep(2000);
          const result = await pollMockupTask(task_key);
          if (result.status === "completed" && result.mockups.length > 0) {
            // Use the mockup matching thumbnailPlacement, or first available
            const match = result.mockups.find((m) => m.placement === thumbnailPlacement) ?? result.mockups[0];
            mockupUrl = match.mockup_url;
            break;
          }
          if (result.status === "failed") break;
        }
      } catch (mockupErr) {
        console.warn(`[PublishJob] Mockup generation failed for ${cp.catalog_product_name}:`, mockupErr);
      }

      // Step 2: if mockup task didn't yield a URL, poll Printful's sync product for its auto-generated preview
      if (!mockupUrl) {
        console.log(`[PublishJob] Falling back to sync product preview for ${cp.catalog_product_name}`);
        mockupUrl = await getSyncProductPreviewUrl(printfulProductId, 25000);
      }

      // Step 3: last resort — use the uploaded design's Printful preview URL
      const thumbnailUrl = mockupUrl ?? printfulPreviewUrl;

      // Save to published_products
      await db.from("published_products").insert({
        design_id: design.id,
        catalog_product_id: cp.catalog_product_id,
        printful_sync_product_id: printfulProductId,
        name: productName,
        thumbnail_url: thumbnailUrl,
        status: "published",
      });

      // Mark item success
      await db.from("publish_job_items").update({
        status: "done",
        printful_product_id: printfulProductId,
      }).match(itemFilter);

      completed++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await db.from("publish_job_items").update({
        status: "failed",
        error: errMsg.slice(0, 500),
      }).match(itemFilter);
      failed++;

      // Log error
      console.error(`[PublishJob ${jobId}] Failed ${cp.catalog_product_name}: ${errMsg}`);
    }

    // Update job progress after each product
    await db.from("publish_jobs").update({ completed, failed }).eq("id", jobId);

    // Increased delay to respect Printful rate limits (max 10 req/s, plus buffer)
    await sleep(3000);
  }

  // Mark job complete
  const finalStatus = failed > 0 && completed === 0 ? "failed" : failed > 0 ? "partial" : "completed";
  await db.from("publish_jobs").update({
    status: finalStatus,
    completed,
    failed,
    finished_at: new Date().toISOString(),
  }).eq("id", jobId);
}
