/**
 * Builds the product feed Pinterest ingests to create Product Pins.
 *
 * Pinterest is a visual discovery platform, so the feed is deduplicated to one
 * item per design and colour. Sizes are not visually distinguishable in a Pin,
 * and publishing thousands of identical images would read as duplicate content.
 * Variants of a design stay linked through `item_group_id`.
 *
 * Field requirements follow Pinterest's retail catalog spec:
 * https://help.pinterest.com/en/business/article/before-you-get-started-with-catalogs
 */
import { buildMerchantRows } from "./merchant-sync";

/** Pinterest caps: id 127, title 500, description 10000, link 511. */
const MAX_ID = 127;
const MAX_TITLE = 500;
const MAX_DESCRIPTION = 10_000;

export interface PinterestFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  /** "24.99 USD" - numeric plus ISO-4217, no currency symbols. */
  price: string;
  availability: "in stock" | "out of stock" | "preorder";
  item_group_id: string;
  product_type?: string;
}

export interface PinterestFeedResult {
  items: PinterestFeedItem[];
  variantCount: number;
}

function slugifyColor(color: string): string {
  return color.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Route mockups through the 2:3 renderer. Pinterest requires catalog images of
 * at least 1000x1500, and Printify serves square 1200x1200.
 */
function toPortraitImageUrl(sourceUrl: string, siteUrl: string): string {
  return `${siteUrl}/api/pinterest-image?src=${encodeURIComponent(sourceUrl)}`;
}

export async function buildPinterestFeed(siteUrl: string): Promise<PinterestFeedResult> {
  const base = siteUrl.replace(/\/$/, "");
  const { rows } = await buildMerchantRows();

  // Collapse variants to one entry per design + colour, keeping the lowest
  // price in each group so the Pin advertises the true "from" price.
  const groups = new Map<string, PinterestFeedItem & { _price: number }>();

  for (const row of rows) {
    const color = row.color?.trim() || "";
    const key = `${row.item_group_id ?? row.id}::${color.toLowerCase()}`;
    const price = typeof row.price === "string" ? Number.parseFloat(row.price) : row.price;
    if (!Number.isFinite(price)) continue;

    const existing = groups.get(key);
    if (existing) {
      if (price < existing._price) {
        existing._price = price;
        existing.price = `${price.toFixed(2)} ${row.currency || "USD"}`;
      }
      continue;
    }

    const itemGroupId = String(row.item_group_id ?? row.id);
    // Pinterest asks that the title carry variant detail such as colour.
    const title = color ? `${row.title} - ${color}` : row.title;
    const id = `${itemGroupId}${color ? `-${slugifyColor(color)}` : ""}`.slice(0, MAX_ID);

    groups.set(key, {
      id,
      title: title.slice(0, MAX_TITLE),
      description: (row.description || row.title).slice(0, MAX_DESCRIPTION),
      link: `${base}/shop/${row.slug ?? row.id}`,
      image_link: toPortraitImageUrl(row.mockup_url ?? "", base),
      price: `${price.toFixed(2)} ${row.currency || "USD"}`,
      availability: (row.stock ?? 0) > 0 ? "in stock" : "out of stock",
      item_group_id: itemGroupId,
      product_type: row.google_product_category ?? undefined,
      _price: price,
    });
  }

  const items = Array.from(groups.values()).map(({ _price, ...item }) => {
    void _price;
    return item;
  });

  return { items, variantCount: rows.length };
}

/** Escape text for inclusion in XML character data. */
export function escapeXml(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    // Drop control characters. A single stray one makes the whole feed fail
    // to parse, which Pinterest reports as a full catalog ingestion failure.
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
