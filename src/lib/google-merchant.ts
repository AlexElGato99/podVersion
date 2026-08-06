/**
 * Google Merchant Center — Content API for Shopping (v2.1)
 *
 * Pushes products from our catalogue into Google Merchant Center so they can
 * appear in Google Shopping / free listings.
 *
 * Auth uses a Google Cloud **service account** that has been granted access in
 * Merchant Center (Merchant Center → Settings → Users → add the service
 * account's email with "Standard" access or higher).
 *
 * Credentials are read from Dashboard -> Settings -> Google Merchant, falling
 * back to these environment variables when nothing has been saved there:
 *   GOOGLE_MERCHANT_ID              e.g. "123456789"
 *   GOOGLE_MERCHANT_CLIENT_EMAIL    service-account@project.iam.gserviceaccount.com
 *   GOOGLE_MERCHANT_PRIVATE_KEY     the service account's private key (PEM)
 *   NEXT_PUBLIC_SITE_URL            used to build each product's `link`
 */
import { google, type content_v2_1 } from "googleapis";
import { getSettingsSection } from "./settings";

const CONTENT_API_SCOPE = "https://www.googleapis.com/auth/content";

/** Row shape coming out of the Supabase `products` table. */
export interface SupabaseProductRow {
  id: string | number;
  title: string;
  description?: string | null;
  /** Numeric or string — normalised to a 2-dp string for Google. */
  price: number | string;
  /** Primary product image (Printify/Printful mockup). Must be a public URL. */
  mockup_url?: string | null;
  /** Inventory count. `0`/null → "out of stock". */
  stock?: number | null;
  size?: string | null;
  color?: string | null;
  /** Optional — groups size/colour variants of the same design together. */
  item_group_id?: string | null;
  /** Optional overrides; sensible defaults are applied when absent. */
  brand?: string | null;
  currency?: string | null;
  google_product_category?: string | null;
  age_group?: string | null;
  gender?: string | null;
  /** Optional pretty URL slug; falls back to `/shop/{id}`. */
  slug?: string | null;
}

export class MerchantConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MerchantConfigError";
  }
}

interface MerchantConfig {
  merchantId: string;
  clientEmail: string;
  privateKey: string;
  siteUrl: string;
}

async function readConfig(): Promise<MerchantConfig> {
  const saved = await getSettingsSection("google_merchant");

  const merchantId = saved.google_merchant_id;
  const clientEmail = saved.google_merchant_client_email;
  // Env files and dashboard textareas both store multi-line PEM keys with
  // literal "\n" sequences. Turn those back into real newlines or the JWT
  // signing step fails with an opaque
  // "error:1E08010C:DECODER routines::unsupported".
  const privateKey = saved.google_merchant_private_key?.replace(/\\n/g, "\n");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://veliova.com";

  const missing = [
    !merchantId && "Merchant ID",
    !clientEmail && "Service account email",
    !privateKey && "Service account private key",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new MerchantConfigError(
      `Google Merchant Center is not configured — missing: ${missing.join(", ")}. ` +
        `Set these in Dashboard -> Settings -> Google Merchant.`
    );
  }

  return {
    merchantId: merchantId!,
    clientEmail: clientEmail!,
    privateKey: privateKey!,
    siteUrl: siteUrl.replace(/\/$/, ""),
  };
}

/** True when Merchant Center credentials are present. */
export async function isMerchantConfigured(): Promise<boolean> {
  try {
    await readConfig();
    return true;
  } catch {
    return false;
  }
}

// The auth client is cached per server process — building a JWT client on
// every webhook call would re-negotiate an access token each time.
let cachedClient: content_v2_1.Content | null = null;

function getContentClient(config: MerchantConfig): content_v2_1.Content {
  if (cachedClient) return cachedClient;

  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: [CONTENT_API_SCOPE],
  });

  cachedClient = google.content({ version: "v2.1", auth });
  return cachedClient;
}

/** Google requires a plain decimal string, e.g. 19 → "19.00". */
function formatPrice(price: number | string): string {
  const value = typeof price === "string" ? Number.parseFloat(price) : price;
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid price value: ${JSON.stringify(price)}`);
  }
  return value.toFixed(2);
}

/**
 * Content API product IDs are `channel:contentLanguage:feedLabel:offerId`.
 * We build it explicitly so update/delete can address the same resource that
 * insert created.
 */
export function buildProductId(
  offerId: string,
  contentLanguage = "en",
  feedLabel = "US",
  channel = "online"
): string {
  return `${channel}:${contentLanguage}:${feedLabel}:${offerId}`;
}

/** Stable per-row offer ID. */
export function buildOfferId(row: Pick<SupabaseProductRow, "id">): string {
  return `veliova-${row.id}`;
}

/**
 * Map a Supabase row onto Google's apparel schema.
 *
 * Apparel & Accessories listings have stricter requirements than generic
 * products: Google requires `ageGroup`, `gender`, `color`, and `size` for
 * clothing, and will disapprove items that omit them.
 */
export function mapToGoogleProduct(
  row: SupabaseProductRow,
  siteUrl: string
): content_v2_1.Schema$Product {
  if (!row.title?.trim()) throw new Error(`Product ${row.id} has no title`);
  if (!row.mockup_url?.trim()) throw new Error(`Product ${row.id} has no mockup_url (imageLink is required)`);

  const currency = row.currency || "USD";
  const inStock = typeof row.stock === "number" ? row.stock > 0 : true;
  const productPath = row.slug ? `/shop/${row.slug}` : `/shop/${row.id}`;

  const product: content_v2_1.Schema$Product = {
    offerId: buildOfferId(row),
    title: row.title.trim().slice(0, 150), // Google truncates past 150 chars
    description: (row.description?.trim() || row.title.trim()).slice(0, 5000),
    link: `${siteUrl}${productPath}`,
    imageLink: row.mockup_url.trim(),

    channel: "online",
    contentLanguage: "en",
    targetCountry: "US",
    feedLabel: "US",

    availability: inStock ? "in stock" : "out of stock",
    condition: "new",
    price: { value: formatPrice(row.price), currency },

    brand: row.brand || "Veliova",
    googleProductCategory:
      row.google_product_category || "Apparel & Accessories > Clothing > Shirts & Tops",

    // ── Apparel-specific attributes ──
    ageGroup: row.age_group || "adult",
    gender: row.gender || "unisex",
    ...(row.color ? { color: row.color } : {}),
    ...(row.size ? { sizes: [row.size], sizeSystem: "US", sizeType: "regular" } : {}),

    // Variants of one design share an itemGroupId so Google groups them.
    itemGroupId: row.item_group_id || String(row.id),

    // Print-on-demand items have no manufacturer barcode. Declaring this
    // explicitly prevents "missing GTIN" disapprovals.
    identifierExists: false,
  };

  return product;
}

export interface MerchantSyncResult {
  offerId: string;
  productId: string | null;
  action: "upserted" | "deleted";
}

/**
 * Create or update a product in Merchant Center.
 *
 * `products.insert` is an upsert in v2.1 — re-inserting the same offerId
 * replaces the existing item, so this handles both INSERT and UPDATE events.
 */
export async function upsertMerchantProduct(
  row: SupabaseProductRow
): Promise<MerchantSyncResult> {
  const config = await readConfig();
  const client = getContentClient(config);
  const product = mapToGoogleProduct(row, config.siteUrl);

  const response = await client.products.insert({
    merchantId: config.merchantId,
    requestBody: product,
  });

  // Note: a 200 here only means Google *accepted* the item — it does not mean
  // the item is approved for serving. Data-quality issues and disapprovals are
  // reported asynchronously and must be read separately via
  // `content.productstatuses.get({ merchantId, productId })`.

  return {
    offerId: product.offerId!,
    productId: response.data.id ?? null,
    action: "upserted",
  };
}

/** Remove a product from Merchant Center (used for DELETE webhook events). */
export async function deleteMerchantProduct(
  row: Pick<SupabaseProductRow, "id">
): Promise<MerchantSyncResult> {
  const config = await readConfig();
  const client = getContentClient(config);
  const offerId = buildOfferId(row);
  const productId = buildProductId(offerId);

  await client.products.delete({
    merchantId: config.merchantId,
    productId,
  });

  return { offerId, productId, action: "deleted" };
}
