/**
 * Printify API client
 *
 * Documentation: https://developers.printify.com/
 * All products/variants are fetched from a specific shop identified by
 * PRINTIFY_SHOP_ID (or the printify_shop_id setting saved in the dashboard).
 */
import { getSettingsSection } from "./settings";

const BASE_URL = "https://api.printify.com/v1";

async function printifyFetch(path: string, options: RequestInit = {}, retriesLeft = 2) {
  const { printify_api_key } = await getSettingsSection("printify");
  if (!printify_api_key) throw new Error("Printify API key is not configured.");

  const isGet = !options.method || options.method.toUpperCase() === "GET";

  // Printify occasionally hangs on individual requests — without a timeout,
  // one stuck request stalls the whole product listing. 15s is generous for
  // a JSON API call but still bounded.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${printify_api_key}`,
        // Don't send Content-Type on GET requests — some Printify endpoints return 400 if you do
        ...(isGet ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      // Printify product responses can exceed 2MB which exceeds Next.js's fetch cache limit.
      // Use no-store so every request fetches fresh data reliably.
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    // Network-level failure (DNS, connection reset, timeout) — fetch()
    // throws a generic "fetch failed" TypeError whose real cause is nested
    // in `.cause`, so surface that instead of letting it get lost upstream.
    const cause = err instanceof Error && "cause" in err ? err.cause : undefined;
    if (retriesLeft > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return printifyFetch(path, options, retriesLeft - 1);
    }
    throw new Error(
      `Printify request failed on ${path}: ${err instanceof Error ? err.message : String(err)}` +
        (cause ? ` (cause: ${cause instanceof Error ? cause.message : String(cause)})` : "")
    );
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 429 && retriesLeft > 0) {
    const retryAfter = Math.min(parseInt(res.headers.get("Retry-After") ?? "2", 10), 5);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return printifyFetch(path, options, retriesLeft - 1);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Printify API error ${res.status} on ${path}: ${body}`);
  }

  return res.json();
}

/**
 * Returns all shop IDs to fetch from.
 * - If printify_shop_id is blank → fetch from ALL shops on the account.
 * - If printify_shop_id is a single ID → use just that one.
 * - If printify_shop_id is comma-separated IDs → use all of them.
 */
async function getShopIds(): Promise<string[]> {
  const { printify_shop_id } = await getSettingsSection("printify");

  if (printify_shop_id) {
    // Support comma-separated list: "12345, 67890"
    return printify_shop_id.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // Auto-discover — use ALL shops on the account
  const data = await printifyFetch("/shops.json");
  const shops: Array<{ id: number; title: string }> = data ?? [];
  if (!shops.length) throw new Error("No Printify shops found for this account.");
  return shops.map((s) => String(s.id));
}

/** @deprecated Use getShopIds() for multi-shop support. */
async function getShopId(): Promise<string> {
  const ids = await getShopIds();
  return ids[0];
}

// ─── Printify types ───────────────────────────────────────────────────────

export interface PrintifyImage {
  src: string;
  variant_ids: number[];
  position: string;
  is_default: boolean;
}

export interface PrintifyVariantOption {
  id: number;
  value: string | number;
}

export interface PrintifyVariant {
  id: number;
  sku: string;
  cost: number;
  price: number;
  title: string;
  grams: number;
  is_enabled: boolean;
  is_default: boolean;
  is_available: boolean;
  options: number[];
}

export interface PrintifyOption {
  name: string;
  type: string;
  values: Array<{ id: number; title: string; colors?: string[]; }>;
}

export interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  images: PrintifyImage[];
  variants: PrintifyVariant[];
  options: PrintifyOption[];
  blueprint_id: number;
  print_provider_id: number;
  print_areas: unknown[];
  created_at: string;
  updated_at: string;
  /** Resolved at fetch time — not from the Printify API directly */
  starting_price: string | null;
  best_image: string;
  /** Best-effort type name resolved from the blueprint title */
  catalog_type_name: string | null;
  /**
   * Which Printify shop this product belongs to — set at fetch time (from
   * the shop being queried), since the account can have multiple shops.
   * Required to place an order for this product against the right shop.
   */
  shop_id: string;
}

function addPrintifyImage(
  target: Array<{ src: string; variant_ids: number[] }>,
  imageIndex: Map<string, number>,
  img: PrintifyImage
) {
  if (!img.src) return;

  const existingIndex = imageIndex.get(img.src);
  if (existingIndex === undefined) {
    imageIndex.set(img.src, target.length);
    target.push({ src: img.src, variant_ids: [...(img.variant_ids ?? [])] });
    return;
  }

  const mergedIds = new Set(target[existingIndex].variant_ids);
  for (const id of img.variant_ids ?? []) mergedIds.add(id);
  target[existingIndex].variant_ids = Array.from(mergedIds);
}

// ─── Blueprint type-name cache ────────────────────────────────────────────

const blueprintCache = new Map<number, string | null>();

async function getBlueprintTypeName(blueprintId: number): Promise<string | null> {
  if (blueprintCache.has(blueprintId)) return blueprintCache.get(blueprintId) ?? null;
  try {
    const data = await printifyFetch(`/catalog/blueprints/${blueprintId}.json`);
    const typeName: string | null = data?.title ?? null;
    blueprintCache.set(blueprintId, typeName);
    return typeName;
  } catch {
    blueprintCache.set(blueprintId, null);
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function getPrintifyProducts(): Promise<PrintifyProduct[]> {
  const shopIds = await getShopIds();

  // Fetch products from every shop in parallel, then merge
  const perShop = await Promise.all(
    shopIds.map(async (shopId) => {
      const shopProducts: PrintifyProduct[] = [];
      for (let page = 1; page <= 3; page++) {
        const data = await printifyFetch(`/shops/${shopId}/products.json?page=${page}&limit=50`);
        const items: PrintifyProduct[] = (data?.data ?? []).map((p: PrintifyProduct) => ({ ...p, shop_id: shopId }));
        shopProducts.push(...items);
        if (items.length < 50) break;
      }
      return shopProducts;
    })
  );

  const allProducts = perShop.flat();

  // Resolve blueprint type name + compute starting_price / best_image
  const resolved = await Promise.all(
    allProducts.map(async (p) => {
      const enabledVariants = p.variants.filter((v) => v.is_enabled && v.is_available);
      const cheapest = enabledVariants.sort((a, b) => a.price - b.price)[0];
      const starting_price = cheapest ? (cheapest.price / 100).toFixed(2) : null;
      const defaultImg = p.images.find((i) => i.is_default) ?? p.images[0];
      const best_image = defaultImg?.src ?? "";
      const catalog_type_name = await getBlueprintTypeName(p.blueprint_id);
      return { ...p, starting_price, best_image, catalog_type_name };
    })
  );

  return resolved;
}

export async function getPrintifyProduct(shopId: string, productId: string): Promise<PrintifyProduct> {
  const data = await printifyFetch(`/shops/${shopId}/products/${productId}.json`);
  return { ...(data as PrintifyProduct), shop_id: shopId };
}

export async function getPrintifyShopId(): Promise<string> {
  return getShopId();
}

/** Map a Printify product into the common shape used by the storefront. */
export function toPrintifyCommonProduct(p: PrintifyProduct) {
  // Deduplicate all mockup images with their variant associations
  const imageIndex = new Map<string, number>();
  const all_images: Array<{ src: string; variant_ids: number[] }> = [];
  for (const img of p.images) {
    addPrintifyImage(all_images, imageIndex, img);
  }

  // Unique enabled color names
  const colorOption = p.options.find((o) => o.type === "color" || o.name.toLowerCase().includes("color"));
  const colorValueIds = new Set(colorOption?.values.map((v) => v.id) ?? []);
  const seenColors = new Set<string>();
  const colors: string[] = [];
  for (const v of p.variants) {
    if (!v.is_enabled) continue;
    for (const optId of v.options) {
      if (colorValueIds.has(optId)) {
        const title = colorOption?.values.find((cv) => cv.id === optId)?.title;
        if (title && !seenColors.has(title)) { seenColors.add(title); colors.push(title); }
      }
    }
  }

  return {
    id: `printify_${p.id}`,
    name: p.title,
    thumbnail_url: p.best_image,
    variants: p.variants.filter((v) => v.is_enabled).length,
    synced: p.variants.filter((v) => v.is_available).length,
    starting_price: p.starting_price,
    best_image: p.best_image,
    catalog_type_name: p.catalog_type_name,
    all_images,
    colors,
    _source: "printify" as const,
    _raw: p,
    shop_id: p.shop_id,
  };
}

/**
 * Normalize a Printify product into the PrintfulProductDetail shape that
 * ProductClient expects. This lets Printify products render in the existing
 * product page without any UI changes.
 *
 * Price mapping: Printify stores prices as integers (cents). We convert to
 * a decimal string to match Printful's retail_price format.
 */
export function printifyToProductDetail(p: PrintifyProduct): import("./printful").PrintfulProductDetail {
  // Build a map of option value IDs → titles (for color/size label extraction)
  const optionValueMap = new Map<number, string>();
  for (const opt of p.options) {
    for (const val of opt.values) {
      optionValueMap.set(val.id, val.title);
    }
  }

  const colorOption = p.options.find((o) => o.type === "color" || o.name.toLowerCase().includes("color"));
  const sizeOption  = p.options.find((o) => o.type === "size"  || o.name.toLowerCase().includes("size"));

  const sync_variants: import("./printful").PrintfulVariant[] = p.variants
    .filter((v) => v.is_enabled)
    .map((v) => {
      const price = (v.price / 100).toFixed(2);

      // Find color/size from this variant's option IDs
      let color: string | null = null;
      let size:  string | null = null;
      for (const optId of v.options) {
        const title = optionValueMap.get(optId) ?? null;
        if (!title) continue;
        if (colorOption?.values.some((ov) => ov.id === optId)) color = title;
        else if (sizeOption?.values.some((ov) => ov.id === optId)) size = title;
      }

      // Color code from first value's colors array if available
      const colorVal = colorOption?.values.find((ov) => ov.id === v.options.find((id) => colorOption.values.some((c) => c.id === id)));
      const colorHex = colorVal?.colors?.[0] ?? null;

      // Pick best image for this variant
      const variantImage = p.images.find((img) => img.variant_ids.includes(v.id)) ?? p.images.find((img) => img.is_default) ?? p.images[0];
      const previewUrl = variantImage?.src ?? "";

      return {
        id: v.id,
        sync_product_id: 0,
        name: `${p.title}${color ? ` / ${color}` : ""}${size ? ` / ${size}` : ""}`,
        retail_price: price,
        currency: "USD",
        files: previewUrl ? [{ type: "preview", preview_url: previewUrl }] : [],
        options: [],
        availability_status: v.is_available ? "active" : "discontinued",
        product: undefined,
        color,
        size,
        color_code: colorHex,
        color_code2: null,
      };
    });

  const defaultImage = p.images.find((i) => i.is_default) ?? p.images[0];

  // Deduplicate all mockup image URLs for the gallery strip, preserving variant_ids
  const imageIndex = new Map<string, number>();
  const allImages: Array<{ src: string; variant_ids: number[] }> = [];
  for (const img of p.images) {
    addPrintifyImage(allImages, imageIndex, img);
  }

  return {
    sync_product: {
      id: 0,
      name: p.title,
      thumbnail_url: defaultImage?.src ?? "",
      description: p.description ?? "",
      variants: sync_variants.length,
      synced: sync_variants.length,
    },
    sync_variants,
    all_images: allImages,
  };
}

// ─── Order creation ─────────────────────────────────────────────────────

export interface PrintifyAddressTo {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country: string;
  region?: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
}

export interface PrintifyOrderLineItem {
  product_id: string;
  variant_id: number;
  quantity: number;
}

/**
 * Create a confirmed order in Printify for fulfillment, and immediately push
 * it into production. Call this only after payment has already been
 * captured (e.g. via PayPal) — this places a real production order that
 * Printify will charge to the shop's own billing.
 *
 * Printify's order-creation endpoint alone does not guarantee the order is
 * sent to production (that depends on the shop's own "auto send to
 * production" setting) — the explicit send_to_production call after
 * creation makes that happen regardless of shop configuration, mirroring
 * Printful's `confirm: true` behavior on order creation.
 */
export async function createPrintifyOrder(params: {
  shopId: string;
  lineItems: PrintifyOrderLineItem[];
  addressTo: PrintifyAddressTo;
  externalId: string;
}): Promise<{ id: string; status: string }> {
  const created = await printifyFetch(`/shops/${params.shopId}/orders.json`, {
    method: "POST",
    body: JSON.stringify({
      external_id: params.externalId,
      line_items: params.lineItems,
      address_to: params.addressTo,
      shipping_method: 1,
      send_shipping_notification: true,
    }),
  });

  const orderId: string = created?.id;
  let status = "pending";

  try {
    const sent = await printifyFetch(`/shops/${params.shopId}/orders/${orderId}/send_to_production.json`, {
      method: "POST",
    });
    status = sent?.status ?? "in-production";
  } catch (err) {
    // Order exists in Printify even if send-to-production failed — surface
    // this to the caller via status so it can be logged/retried, without
    // losing the already-created order id.
    console.error(`[printify] send_to_production failed for order ${orderId}:`, err);
    status = "created-not-sent";
  }

  return { id: orderId, status };
}
