import { getSettingsSection } from "./settings";

const BASE_URL = "https://api.printful.com";

async function printfulFetch(path: string, options: RequestInit = {}, retriesLeft = 1) {
  const { printful_api_key, printful_store_id } = await getSettingsSection("printful");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${printful_api_key}`,
      "Content-Type": "application/json",
      "X-PF-Store-Id": printful_store_id ?? "",
      ...options.headers,
    },
    next: { revalidate: 300 }, // re-fetch every 5 minutes — product data changes rarely, and this keeps request volume well under Printful's rate limit
  });

  if (res.status === 429 && retriesLeft > 0) {
    // Back off briefly (Printful rate limit window) and retry once — only worth it for a short wait.
    const retryAfter = Math.min(parseInt(res.headers.get("Retry-After") ?? "2", 10), 5);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return printfulFetch(path, options, retriesLeft - 1);
  }

  if (!res.ok) {
    throw new Error(`Printful API error ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

/**
 * Run async tasks with a limited concurrency, to avoid bursting past Printful's
 * per-second rate limit when resolving many products/colors at once.
 */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
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
  /** ID of the parent sync product — Printful's API field is `sync_product_id`, NOT `product_id` */
  sync_product_id: number;
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

// Cache catalog product type lookups within a single server process — many
// sync variants (different colors/sizes) share the same underlying catalog
// product, so this avoids redundant /products/{id} calls.
const catalogTypeCache = new Map<number, string | null>();

/**
 * Look up the REAL catalog product type name (e.g. "T-Shirt", "Snapback
 * Trucker Cap", "Ceramic Mug") for a given Printful catalog product ID.
 * This is authoritative and independent of whatever custom name a merchant
 * gave their synced store product — used so homepage/shop category sections
 * classify products correctly even when the product's own title doesn't
 * mention its type (e.g. a cap named "Summer Drop 2026").
 */
async function getCatalogProductTypeName(catalogProductId: number): Promise<string | null> {
  if (catalogTypeCache.has(catalogProductId)) return catalogTypeCache.get(catalogProductId) ?? null;
  try {
    const data = await printfulFetch(`/products/${catalogProductId}`);
    const typeName: string | null = data.result?.product?.type_name ?? data.result?.product?.type ?? null;
    catalogTypeCache.set(catalogProductId, typeName);
    return typeName;
  } catch {
    catalogTypeCache.set(catalogProductId, null);
    return null;
  }
}

export async function getProducts(): Promise<(PrintfulProduct & { starting_price: string | null; best_image: string; catalog_type_name: string | null })[]> {
  const data = await printfulFetch("/store/products?limit=50");
  const products: PrintfulProduct[] = data.result ?? [];

  // Resolve details with limited concurrency — firing all requests in parallel
  // reliably trips Printful's rate limiter (confirmed: 429s past ~40 concurrent).
  const withPrices = await mapWithConcurrency(products, 6, async (p) => {
    try {
      const detail: PrintfulProductDetail = await printfulFetch(`/store/products/${p.id}`);
      const price = detail.sync_variants?.[0]?.retail_price ?? null;
      // Best image priority: variant preview (real garment mockup) → thumbnail
      const previewFile = detail.sync_variants
        ?.flatMap((v) => v.files ?? [])
        .find((f) => f.type === "preview" && f.preview_url);
      const best_image = previewFile?.preview_url ?? p.thumbnail_url ?? "";
      const catalogProductId = detail.sync_variants?.[0]?.product?.product_id ?? null;
      const catalog_type_name = catalogProductId ? await getCatalogProductTypeName(catalogProductId) : null;
      return { ...p, starting_price: price, best_image, catalog_type_name };
    } catch {
      return { ...p, starting_price: null, best_image: p.thumbnail_url ?? "", catalog_type_name: null };
    }
  });

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
    const colorEntries = Array.from(colorToVariantId.entries());
    const catalogResults = await mapWithConcurrency(colorEntries, 6, async ([colorName, vid]) => {
      try {
        const d = await printfulFetch(`/catalog/variants/${vid}`);
        const v = d.result?.variant as {
          color?: { color_name: string; color_codes: string[] };
        };
        return {
          colorName,
          color_code:  v?.color?.color_codes?.[0] ?? null,
          color_code2: v?.color?.color_codes?.[1] ?? null,
        };
      } catch {
        return { colorName, color_code: null, color_code2: null };
      }
    });

    const hexMap = new Map<string, { color_code: string | null; color_code2: string | null }>();
    for (const r of catalogResults) {
      hexMap.set(r.colorName, {
        color_code:  r.color_code,
        color_code2: r.color_code2,
      });
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

export interface PrintfulRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

export interface PrintfulOrderItem {
  /**
   * ID of the store's synced product variant (`sync_variants[].id` from
   * getProduct/getProducts) — NOT the raw Printful catalog variant ID.
   * Using `sync_variant_id` tells Printful to reuse the print files/mockups
   * already configured for that synced variant, so no `files` array is
   * needed here. Sending this same number as `variant_id` instead would be
   * interpreted as a catalog variant and rejected (or fail silently)
   * without an accompanying `files` array.
   */
  sync_variant_id: number;
  quantity: number;
  retail_price: string;
}

/**
 * Create a confirmed order in Printful for fulfillment. Call this only
 * after payment has already been captured (e.g. via PayPal) — this places
 * a real production order that Printful will charge to the store's own
 * Printful billing account.
 */
export async function createPrintfulOrder(params: {
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
  externalId?: string;
}): Promise<{ id: number; status: string }> {
  const data = await printfulFetch("/orders", {
    method: "POST",
    body: JSON.stringify({
      external_id: params.externalId,
      recipient: params.recipient,
      items: params.items,
      confirm: true,
    }),
  });
  return { id: data.result?.id, status: data.result?.status };
}
