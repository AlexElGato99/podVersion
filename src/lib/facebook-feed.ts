/**
 * Builds the product feed Facebook Merchant Center ingests.
 *
 * Facebook Merchant Center accepts CSV, TSV, or XML feeds. We use XML format
 * similar to Google Shopping and Pinterest for consistency.
 *
 * Field requirements follow Facebook's Catalog spec:
 * https://developers.facebook.com/docs/marketing-api/catalog/fields
 */
import { buildMerchantRows } from "./merchant-sync";

/** Facebook field length caps */
const MAX_ID = 100;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;

export interface FacebookFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  /** "24.99" - numeric only, currency is set per catalog in Facebook */
  price: string;
  currency: string;
  availability: "in stock" | "out of stock" | "preorder";
  /** Unique identifier for the product (design), grouping all variants */
  item_group_id: string;
  /** For Facebook inventory tracking */
  quantity: string;
  /** Product condition */
  condition: "new" | "refurbished" | "used";
  /** Brand name */
  brand: string;
  /** Product category in Facebook's taxonomy */
  category?: string;
  /** Color variant */
  color?: string;
  /** Size variant */
  size?: string;
  /** Material composition */
  material?: string;
  /** Pickup/shipping availability */
  shipping_weight?: string;
}

export interface FacebookFeedResult {
  items: FacebookFeedItem[];
  variantCount: number;
}

/**
 * Escape XML special characters for feed data.
 */
export function escapeXml(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    // Drop control characters
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue;
    if (ch === "&") out += "&amp;";
    else if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else if (ch === String.fromCharCode(34)) out += "&quot;";
    else if (ch === String.fromCharCode(39)) out += "&apos;";
    else out += ch;
  }
  return out;
}

/**
 * Map product Google category to Facebook category.
 * Facebook accepts either its own taxonomy or Google's, so we can reuse the google_product_category.
 */
function mapToFacebookCategory(googleCategory?: string): string {
  if (!googleCategory) return "Apparel & Accessories";

  // Facebook accepts Google categories, but we can also map to Facebook's simpler taxonomy
  if (googleCategory.includes("Apparel")) return "Clothing";
  if (googleCategory.includes("Phone Case")) return "Phones";
  if (googleCategory.includes("Canvas") || googleCategory.includes("Poster")) return "Home";
  if (googleCategory.includes("Mug") || googleCategory.includes("Drinkware")) return "Home";
  if (googleCategory.includes("Sticker")) return "Arts & Crafts";

  return "Apparel & Accessories";
}

/**
 * Build Facebook Merchant Center feed from live products.
 * Unlike Pinterest, we don't deduplicate - Facebook handles variants natively.
 */
export async function buildFacebookFeed(siteUrl: string): Promise<FacebookFeedResult> {
  const base = siteUrl.replace(/\/$/, "");
  const { rows } = await buildMerchantRows();

  const items: FacebookFeedItem[] = [];

  for (const row of rows) {
    const price = typeof row.price === "string" ? row.price : String(row.price);

    items.push({
      id: `${row.id}`.slice(0, MAX_ID),
      title: row.title.slice(0, MAX_TITLE),
      description: (row.description || row.title).slice(0, MAX_DESCRIPTION),
      link: `${base}/shop/${row.slug ?? row.id}`,
      image_link: row.mockup_url ?? "",
      price: price,
      currency: row.currency || "USD",
      availability: (row.stock ?? 0) > 0 ? "in stock" : "out of stock",
      quantity: String(row.stock ?? 99),
      item_group_id: String(row.item_group_id ?? row.id),
      condition: "new",
      brand: "Veliova",
      category: mapToFacebookCategory(row.google_product_category ?? undefined),
      color: row.color?.trim() || undefined,
      size: row.size?.trim() || undefined,
    });
  }

  return { items, variantCount: rows.length };
}
