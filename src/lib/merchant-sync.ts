/**
 * Builds Google Merchant Center rows from the live Printify/Printful catalogue.
 *
 * Google treats every size and colour combination as its own product, grouped
 * by `itemGroupId`, so one design expands into many rows here.
 */
import { getStoreProducts } from "./products";
import { printifyToProductDetail } from "./printify";
import { getProduct as getPrintfulProduct } from "./printful";
import { productSlug } from "./utils";
import type { SupabaseProductRow } from "./google-merchant";

/**
 * Printify descriptions are HTML. Google expects plain text, and rejects or
 * mangles markup in the description field.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Print-on-demand items are made to order, so there is no real inventory
 * count. Any variant Printify still offers is reported as available.
 */
const MADE_TO_ORDER_STOCK = 99;

/**
 * Map a product onto Google's product taxonomy.
 *
 * This matters beyond categorisation: Google validates required attributes per
 * category. Filing a canvas print under an apparel category makes it expect a
 * colour and a clothing size, which is why non-apparel items were being flagged.
 *
 * Checked most-specific-first, the same ordering used elsewhere in the app.
 */
const CATEGORY_RULES: { test: RegExp; category: string }[] = [
  { test: /phone case|tough case|snap case|phone/i, category: "Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases" },
  { test: /canvas|poster|wall art|art print|framed print/i, category: "Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork" },
  { test: /mug|tumbler|drinkware|cup|bottle/i, category: "Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs" },
  { test: /sticker|decal/i, category: "Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Embellishments & Trims > Decorative Stickers" },
  { test: /tote|backpack|handbag|\bbag\b/i, category: "Apparel & Accessories > Handbags, Wallets & Cases > Handbags" },
  { test: /hat|cap|beanie|snapback|trucker/i, category: "Apparel & Accessories > Clothing Accessories > Hats" },
  { test: /sock/i, category: "Apparel & Accessories > Clothing > Underwear & Socks > Socks" },
  { test: /hoodie|sweatshirt|pullover|fleece|crewneck/i, category: "Apparel & Accessories > Clothing > Shirts & Tops" },
  { test: /t-shirt|tee|shirt|tank|jersey|polo/i, category: "Apparel & Accessories > Clothing > Shirts & Tops" },
];

const DEFAULT_CATEGORY = "Apparel & Accessories > Clothing > Shirts & Tops";

function inferGoogleCategory(name: string, catalogTypeName?: string | null): string {
  // The Printify blueprint title is authoritative; the merchant's own product
  // title is only a fallback, since it may not mention the product type.
  const primary = catalogTypeName?.trim() || "";
  const match =
    CATEGORY_RULES.find((r) => primary && r.test.test(primary)) ??
    CATEGORY_RULES.find((r) => r.test.test(name));
  return match?.category ?? DEFAULT_CATEGORY;
}

export interface CatalogBuildResult {
  rows: SupabaseProductRow[];
  productCount: number;
  skipped: Array<{ product: string; reason: string }>;
}

/**
 * Expand the whole storefront catalogue into one row per sellable variant.
 */
export async function buildMerchantRows(): Promise<CatalogBuildResult> {
  const products = await getStoreProducts();
  const rows: SupabaseProductRow[] = [];
  const skipped: CatalogBuildResult["skipped"] = [];

  for (const product of products) {
    try {
      // Printify products already carry their full variant list on `_raw`,
      // so no extra API call is needed. Printful needs a detail fetch.
      const detail =
        product._source === "printify" && product._raw
          ? printifyToProductDetail(product._raw)
          : await getPrintfulProduct(String(product.id));

      const description = htmlToPlainText(detail.sync_product.description ?? "");
      const slug = productSlug(product.name, product.id);
      const itemGroupId = String(product.id);
      const googleCategory = inferGoogleCategory(product.name, product.catalog_type_name);

      const sellable = detail.sync_variants.filter(
        (v) => v.availability_status === "active"
      );

      if (sellable.length === 0) {
        skipped.push({ product: product.name, reason: "no available variants" });
        continue;
      }

      for (const variant of sellable) {
        const image =
          variant.files?.find((f) => f.type === "preview" && f.preview_url)?.preview_url ||
          product.best_image ||
          product.thumbnail_url;

        if (!image) {
          skipped.push({ product: `${product.name} / ${variant.name}`, reason: "no image" });
          continue;
        }

        rows.push({
          id: `${product.id}-${variant.id}`,
          item_group_id: itemGroupId,
          title: product.name,
          description: description || product.name,
          price: variant.retail_price,
          currency: variant.currency || "USD",
          mockup_url: image,
          stock: MADE_TO_ORDER_STOCK,
          size: variant.size ?? null,
          color: variant.color ?? null,
          google_product_category: googleCategory,
          slug,
        });
      }
    } catch (err) {
      skipped.push({
        product: product.name,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { rows, productCount: products.length, skipped };
}
