import { NextRequest, NextResponse } from "next/server";
import { createMockupTask, pollMockupTask, sleep } from "@/lib/printful";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const res = await fetch(`https://api.printful.com/store/products/${id}`, {
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID ?? "",
    },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: `Printful error ${res.status}` }, { status: res.status });

  const data = await res.json();
  const syncVariants: {
    name: string;
    files?: { type: string; preview_url?: string; url?: string }[];
  }[] = data.result?.sync_variants ?? [];

  const seen = new Set<string>();
  const previews: { url: string; label: string }[] = [];

  for (const v of syncVariants) {
    for (const f of v.files ?? []) {
      if (f.type === "preview" && f.preview_url && !seen.has(f.preview_url)) {
        seen.add(f.preview_url);
        const parts = v.name.split(" / ").map((p: string) => p.trim());
        const colorLabel = parts.length >= 3 ? parts[parts.length - 2] : parts[parts.length - 1] ?? "Preview";
        previews.push({ url: f.preview_url, label: colorLabel });
      }
    }
  }

  if (previews.length === 0) {
    for (const v of syncVariants) {
      for (const f of v.files ?? []) {
        if ((f.type === "default" || f.type === "front") && (f.preview_url ?? f.url)) {
          const url = (f.preview_url ?? f.url)!;
          if (!seen.has(url)) {
            seen.add(url);
            const parts = v.name.split(" / ").map((p: string) => p.trim());
            previews.push({ url, label: parts.length >= 2 ? parts[parts.length - 2] : v.name });
          }
        }
      }
    }
  }

  const mainThumb: string | undefined = data.result?.sync_product?.thumbnail_url;
  if (mainThumb && !seen.has(mainThumb)) previews.unshift({ url: mainThumb, label: "Printful Thumbnail" });

  return NextResponse.json({ previews });
}

export async function POST(req: NextRequest) {
  const { sync_product_id } = await req.json();
  if (!sync_product_id) return NextResponse.json({ error: "sync_product_id required" }, { status: 400 });

  const productRes = await fetch(`https://api.printful.com/store/products/${sync_product_id}`, {
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID ?? "",
    },
    cache: "no-store",
  });
  if (!productRes.ok) return NextResponse.json({ error: `Could not fetch product: ${productRes.status}` }, { status: productRes.status });

  const productData = await productRes.json();
  const syncVariants: {
    name: string;
    product?: { product_id: number; variant_id: number };
    files?: { type: string; id?: number; url?: string; preview_url?: string }[];
  }[] = productData.result?.sync_variants ?? [];

  if (syncVariants.length === 0) return NextResponse.json({ error: "Product has no variants" }, { status: 400 });

  const catalogProductId = syncVariants.find((v) => v.product?.product_id)?.product?.product_id;
  if (!catalogProductId) return NextResponse.json({ error: "Could not determine catalog product ID" }, { status: 400 });

  const variantIdSet = new Set<number>();
  for (const v of syncVariants) {
    if (v.product?.variant_id) variantIdSet.add(v.product.variant_id);
    if (variantIdSet.size >= 5) break;
  }
  const variantIds = Array.from(variantIdSet);

  const allFiles = syncVariants.flatMap((v) => v.files ?? []);
  const designFile = allFiles.find((f) => f.type !== "preview" && (f.url ?? f.preview_url));
  const designUrl = designFile?.url ?? designFile?.preview_url;
  if (!designUrl) return NextResponse.json({ error: "Could not extract design file URL" }, { status: 400 });

  let placements: string[] = ["front"];
  try {
    const pfRes = await fetch(`https://api.printful.com/v2/catalog-products/${catalogProductId}/printfiles`, {
      headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
    });
    if (pfRes.ok) {
      const pfData = await pfRes.json();
      const available = (pfData.data?.placements ?? []).map((p: { placement_id: string }) => p.placement_id);
      if (available.length > 0) placements = available;
    }
  } catch { /* use default */ }

  const allMockups: { placement: string; url: string }[] = [];

  for (const placement of placements) {
    try {
      const { task_key } = await createMockupTask({ catalogProductId, variantIds, fileUrl: designUrl, placement });
      for (let i = 0; i < 20; i++) {
        await sleep(2000);
        const result = await pollMockupTask(task_key);
        if (result.status === "completed") {
          for (const m of result.mockups) allMockups.push({ placement: m.placement, url: m.mockup_url });
          break;
        }
        if (result.status === "failed") break;
      }
    } catch (e) {
      console.warn(`[SeedMockups] Placement ${placement} failed:`, e);
    }
    await sleep(1500);
  }

  if (allMockups.length === 0) return NextResponse.json({ error: "Mockup generation produced no images." }, { status: 500 });

  return NextResponse.json({ mockups: allMockups });
}
