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

/**
 * Browse Printful v2 catalog products with pagination.
 */
export async function getCatalogProducts(params?: { limit?: number; offset?: number; category_id?: number }) {
  const qs = new URLSearchParams();
  if (params?.limit)       qs.set("limit",       String(params.limit));
  if (params?.offset)      qs.set("offset",      String(params.offset));
  if (params?.category_id) qs.set("category_id", String(params.category_id));
  const url = `/v2/catalog-products?${qs.toString()}`;
  const res = await fetch(`https://api.printful.com${url}`, {
    headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Printful catalog error ${res.status}`);
  const data = await res.json();
  return { products: data.data ?? [], paging: data.paging ?? {} };
}

/**
 * Get variants for a catalog product (v2).
 */
export async function getCatalogProductVariants(catalogProductId: number) {
  const res = await fetch(`https://api.printful.com/v2/catalog-products/${catalogProductId}/catalog-variants?limit=100`, {
    headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Printful variants error ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}

/**
 * Get printfile (placement) info for a catalog product (v2).
 */
export async function getCatalogProductPrintfiles(catalogProductId: number) {
  const res = await fetch(`https://api.printful.com/v2/catalog-products/${catalogProductId}/printfiles`, {
    headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return { placements: [] };
  const data = await res.json();
  return data.data ?? { placements: [] };
}

/**
 * Upload a file URL to Printful's file library (returns Printful file ID).
 */
export async function uploadFileToPrintful(fileUrl: string, fileName: string): Promise<{ id: number; preview_url: string }> {
  const res = await fetch("https://api.printful.com/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "default", url: fileUrl, filename: fileName, visible: true }),
  });
  if (!res.ok) throw new Error(`Printful file upload error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.result;
}

/**
 * Create a sync product in Printful (v1 API — most compatible).
 * variants: array of { variant_id, retail_price, placement, fileUrl }
 */
export async function createPrintfulSyncProduct(params: {
  name: string;
  thumbnail: string;
  variants: { variant_id: number; retail_price: string; placement: string; fileUrl: string }[];
}): Promise<{ id: number; external_id: string | null }> {
  const syncVariants = params.variants.map((v) => ({
    variant_id: v.variant_id,
    retail_price: v.retail_price,
    files: [{ placement: v.placement, url: v.fileUrl }],
  }));

  const body = {
    sync_product: { name: params.name, thumbnail: params.thumbnail },
    sync_variants: syncVariants,
  };

  const res = await fetch("https://api.printful.com/store/products", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Printful create product error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const sp = data.result?.sync_product;
  return { id: sp?.id, external_id: sp?.external_id ?? null };
}

/**
 * Given a product id and a target hex color (e.g. "#721d37"),
 * returns the shirt image URL for the variant whose color_code matches.
 * Falls back to null if no match.
 */
export async function getProductImageForColor(productId: number, hexColor: string): Promise<string | null> {
  try {
    const data = await printfulFetch(`/store/products/${productId}`);
    const variants: {
      name: string;
      files?: { type: string; preview_url?: string }[];
      product?: { variant_id: number; image: string };
    }[] = data.result?.sync_variants ?? [];

    // Collect unique color → variantId + shirtUrl
    const seen = new Map<number, { shirtUrl: string; mockupUrl: string | null }>();
    for (const v of variants) {
      const vid = v.product?.variant_id;
      if (!vid || seen.has(vid)) continue;
      const mockup = v.files?.find((f) => f.type === "preview" && f.preview_url)?.preview_url ?? null;
      seen.set(vid, { shirtUrl: v.product!.image, mockupUrl: mockup });
    }

    // Fetch hex codes in parallel
    const needle = hexColor.toLowerCase().replace(/\s/g, "");
    const results = await Promise.allSettled(
      Array.from(seen.entries()).map(async ([vid, imgs]) => {
        const r = await printfulFetch(`/catalog/variants/${vid}`);
        const codes: string[] = r.result?.variant?.color?.color_codes ?? [];
        const match = codes.some((c: string) => c.toLowerCase().replace(/\s/g, "") === needle);
        return match ? imgs : null;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        // Prefer design mockup, fall back to plain shirt image
        return r.value.mockupUrl ?? r.value.shirtUrl;
      }
    }
    return null;
  } catch {
    return null;
  }
}
