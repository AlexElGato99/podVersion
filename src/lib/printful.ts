const BASE_URL = "https://api.printful.com";

async function printfulFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
      "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID ?? "",
      ...options.headers,
    },
    next: { revalidate: 60 }, // re-fetch every 60 seconds
  });

  if (!res.ok) {
    throw new Error(`Printful API error ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

export interface PrintfulProduct {
  id: number;
  name: string;
  thumbnail_url: string;
  variants: number;
  synced: number;
}

export interface PrintfulVariant {
  id: number;
  product_id: number;
  name: string;
  retail_price: string;
  currency: string;
  files: { type: string; preview_url: string }[];
  options: { id: string; value: string | boolean | string[] }[];
  availability_status: string;
  /** catalog variant reference — used to fetch real color/size data */
  product?: { variant_id: number; product_id: number; image: string; name: string };
  /** Color name from Printful catalog, e.g. "Black Heather" */
  color?: string | null;
  /** Primary hex color code from Printful catalog, e.g. "#0b0b0b" */
  color_code?: string | null;
  /** Secondary hex color code (for split/heather colors) */
  color_code2?: string | null;
  /** Size label from Printful catalog, e.g. "XS", "M", "2XL" */
  size?: string | null;
}

export interface PrintfulProductDetail {
  sync_product: PrintfulProduct & { description: string };
  sync_variants: PrintfulVariant[];
}

export async function getProducts(): Promise<(PrintfulProduct & { starting_price: string | null; best_image: string })[]> {
  const data = await printfulFetch("/store/products?limit=50");
  const products: PrintfulProduct[] = data.result ?? [];

  const withPrices = await Promise.all(
    products.map(async (p) => {
      try {
        const detail: PrintfulProductDetail = await printfulFetch(`/store/products/${p.id}`);
        const price = detail.sync_variants?.[0]?.retail_price ?? null;
        // Best image priority: variant preview (with design) → thumbnail
        const previewFile = detail.sync_variants
          ?.flatMap((v) => v.files ?? [])
          .find((f) => f.type === "preview" && f.preview_url);
        const best_image = previewFile?.preview_url ?? p.thumbnail_url ?? "";
        return { ...p, starting_price: price, best_image };
      } catch {
        return { ...p, starting_price: null, best_image: p.thumbnail_url ?? "" };
      }
    })
  );

  return withPrices;
}

export async function getProduct(id: string): Promise<PrintfulProductDetail> {
  const data = await printfulFetch(`/store/products/${id}`);
  const result: PrintfulProductDetail = data.result;

  // --- Step 1: Parse color and size from variant name ---
  // Printful name format: "Product Name / Color Name / Size"
  // This is always populated regardless of options array.
  result.sync_variants = result.sync_variants.map((sv) => {
    const parts = sv.name.split(" / ").map((p) => p.trim());
    let color: string | null = null;
    let size: string | null = null;
    if (parts.length >= 3) {
      color = parts[parts.length - 2];
      size  = parts[parts.length - 1];
    } else if (parts.length === 2) {
      // Could be "Product / Size" or "Product / Color" — try to detect size
      const SIZE_RE = /^(XS|S|M|L|XL|\d*XL|One Size|OS|\d+["']?\s*x\s*\d+["']?)$/i;
      if (SIZE_RE.test(parts[1])) size = parts[1];
      else color = parts[1];
    }
    return { ...sv, color, size };
  });

  // --- Step 2: Fetch hex color codes — one catalog call per unique color ---
  // Group: color name → first sync variant's catalog variant_id
  const colorToVariantId = new Map<string, number>();
  for (const sv of result.sync_variants) {
    if (sv.color && sv.product?.variant_id && !colorToVariantId.has(sv.color)) {
      colorToVariantId.set(sv.color, sv.product.variant_id);
    }
  }

  if (colorToVariantId.size > 0) {
    const catalogResults = await Promise.allSettled(
      Array.from(colorToVariantId.entries()).map(([colorName, vid]) =>
        printfulFetch(`/catalog/variants/${vid}`).then((d) => {
          const v = d.result?.variant as {
            color?: { color_name: string; color_codes: string[] };
          };
          return {
            colorName,
            color_code:  v?.color?.color_codes?.[0] ?? null,
            color_code2: v?.color?.color_codes?.[1] ?? null,
          };
        })
      )
    );

    const hexMap = new Map<string, { color_code: string | null; color_code2: string | null }>();
    for (const r of catalogResults) {
      if (r.status === "fulfilled") {
        hexMap.set(r.value.colorName, {
          color_code:  r.value.color_code,
          color_code2: r.value.color_code2,
        });
      }
    }

    result.sync_variants = result.sync_variants.map((sv) => {
      const hex = sv.color ? hexMap.get(sv.color) : undefined;
      return {
        ...sv,
        color_code:  hex?.color_code  ?? null,
        color_code2: hex?.color_code2 ?? null,
      };
    });
  }

  return result;
}

export async function getCatalogCategories() {
  const data = await printfulFetch("/categories");
  return data.result?.categories ?? [];
}
