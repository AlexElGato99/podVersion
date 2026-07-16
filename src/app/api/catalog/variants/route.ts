import { NextRequest, NextResponse } from "next/server";

const PRINTFUL_API = "https://api.printful.com";
const authHeader = () => ({ Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` });

interface RawVariant {
  id: number;
  name: string;
  size?: string;
  color?: string;
  color_code?: string;
  color_code2?: string;
  image?: string;
  placement_dimensions?: { placement: string; height: number; width: number; orientation: string }[];
}

// GET /api/catalog/variants?product_id=xxx
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("product_id");
  if (!productId) return NextResponse.json({ error: "product_id required" }, { status: 400 });

  try {
    // ── Step 1: Fetch ALL variants (no cache — offset-based pagination can shift) ──
    let allVariants: RawVariant[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const res = await fetch(
        `${PRINTFUL_API}/v2/catalog-products/${productId}/catalog-variants?limit=${limit}&offset=${offset}`,
        { headers: authHeader(), cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Printful variants error ${res.status}`);
      const data = await res.json();
      const batch: RawVariant[] = data.data ?? [];
      allVariants = allVariants.concat(batch);
      if (batch.length < limit) break;
      offset += limit;
    }

    // ── Step 2: Group by color, collect placement_dimensions ──
    const colorMap = new Map<string, {
      color: string;
      color_code: string;
      color_code2?: string;
      image?: string;
      // One representative variant ID per color for availability check
      _rep_id: number;
      sizes: { id: number; size: string; in_stock: boolean }[];
    }>();

    // Collect all unique placements across all variants for this product
    const placementSet = new Map<string, { placement: string; height: number; width: number; orientation: string }>();

    for (const v of allVariants) {
      const color     = v.color ?? "Default";
      const colorCode = v.color_code ?? "#cccccc";

      if (!colorMap.has(color)) {
        colorMap.set(color, {
          color,
          color_code: colorCode,
          color_code2: v.color_code2 ?? undefined,
          image: v.image,
          _rep_id: v.id,
          sizes: [],
        });
      }

      colorMap.get(color)!.sizes.push({
        id: v.id,
        size: v.size ?? "One Size",
        in_stock: true, // will be updated below
      });

      // Collect placement dimensions
      for (const pd of v.placement_dimensions ?? []) {
        if (!placementSet.has(pd.placement)) {
          placementSet.set(pd.placement, pd);
        }
      }
    }

    // ── Step 3: Batch-fetch availability for one representative variant per color ──
    // We only need one per color to determine if the whole color is available
    const repIds = Array.from(colorMap.values()).map((c) => c._rep_id);

    const availabilityResults = await Promise.allSettled(
      repIds.map(async (variantId) => {
        const res = await fetch(
          `${PRINTFUL_API}/v2/catalog-variants/${variantId}/availability`,
          { headers: authHeader(), cache: "no-store" }
        );
        if (!res.ok) return { variantId, in_stock: true }; // default to available on error
        const data = await res.json();
        // A variant is in_stock if any technique has worldwide availability "in stock" or "stocked on demand"
        const techniques: { technique: string; selling_regions: { name: string; availability: string }[] }[] =
          data.data?.techniques ?? [];
        const available = techniques.some((t) =>
          t.selling_regions.some((r) =>
            r.name === "worldwide" && (r.availability === "in stock" || r.availability === "stocked on demand")
          )
        );
        return { variantId, in_stock: available };
      })
    );

    // Build availability map: variantId → in_stock
    const availMap = new Map<number, boolean>();
    for (const result of availabilityResults) {
      if (result.status === "fulfilled") {
        availMap.set(result.value.variantId, result.value.in_stock);
      }
    }

    // ── Step 4: Apply availability to each color's sizes ──
    // For a color: if the rep variant is unavailable, check each size individually.
    // To keep things fast, we apply the color-level availability to all sizes of that color
    // (rare edge case: some sizes of a color available and others not — acceptable simplification)
    const colorEntries = Array.from(colorMap.values());
    for (const c of colorEntries) {
      const colorAvailable = availMap.get(c._rep_id) ?? true;
      if (!colorAvailable) {
        // Mark all sizes of this color as OOS
        c.sizes = c.sizes.map((s) => ({ ...s, in_stock: false }));
      }
    }

    // ── Step 5: Sort sizes, sort colors alphabetically ──
    const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "One Size"];
    const colors = colorEntries
      .map(({ _rep_id: _, ...c }) => ({
        ...c,
        sizes: c.sizes.sort((a, b) => {
          const ai = SIZE_ORDER.indexOf(a.size);
          const bi = SIZE_ORDER.indexOf(b.size);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        }),
      }))
      .sort((a, b) => a.color.localeCompare(b.color));

    const placements = Array.from(placementSet.values())
      .sort((a, b) => a.placement.localeCompare(b.placement));

    return NextResponse.json({ colors, total: allVariants.length, placements });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
