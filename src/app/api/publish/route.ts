import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCatalogProductVariants, getCatalogProductPrintfiles, createPrintfulSyncProduct } from "@/lib/printful";

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
  const { design_id, collection_id } = body;

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

  // Run publishing in background (fire-and-forget from Next.js perspective)
  // We return jobId immediately, then the background loop runs
  runPublishJob(job.id, design, collectionProducts).catch(console.error);

  return NextResponse.json({ jobId: job.id });
}

async function runPublishJob(
  jobId: string,
  design: { id: string; name: string; url: string; tags?: string },
  collectionProducts: { catalog_product_id: number; catalog_product_name: string; placement?: string; default_price?: string }[]
) {
  let completed = 0;
  let failed = 0;

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

      // Get variants for this catalog product
      const variants = await getCatalogProductVariants(cp.catalog_product_id);
      if (!variants || variants.length === 0) throw new Error("No variants found for catalog product");

      // Get placement info
      const printfiles = await getCatalogProductPrintfiles(cp.catalog_product_id);
      const placement = cp.placement
        ?? printfiles?.placements?.[0]?.placement_id
        ?? "front";

      // Use first 20 variants (most stores don't need all sizes/colors upfront)
      const selectedVariants = variants.slice(0, 20);

      const syncVariants = selectedVariants.map((v: { id: number; retail_price?: string }) => ({
        variant_id: v.id,
        retail_price: cp.default_price ?? "24.99",
        placement,
        fileUrl: design.url,
      }));

      // Create product in Printful
      const productName = `${design.name} — ${cp.catalog_product_name}`;
      const { id: printfulProductId } = await createPrintfulSyncProduct({
        name: productName,
        thumbnail: design.url,
        variants: syncVariants,
      });

      // Save to published_products
      await db.from("published_products").insert({
        design_id: design.id,
        catalog_product_id: cp.catalog_product_id,
        printful_sync_product_id: printfulProductId,
        name: productName,
        thumbnail_url: design.url,
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

    // Small delay to respect Printful rate limits (10 req/s)
    await new Promise((r) => setTimeout(r, 200));
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
