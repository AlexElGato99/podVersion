/**
 * Provider-aware product fetching.
 *
 * All storefront pages (homepage, /shop, /shop/[id]) should import from here
 * rather than calling @/lib/printful or @/lib/printify directly. This file
 * reads the `pod_provider` setting and routes to the correct API(s) so
 * switching providers in the dashboard is reflected immediately.
 */
import { getSettingsSection } from "./settings";
import { getProducts as getPrintfulProducts, getProduct as getPrintfulProduct } from "./printful";
import { getPrintifyProducts, getPrintifyProduct, getPrintifyShopId, toPrintifyCommonProduct } from "./printify";
import type { PrintfulProductDetail } from "./printful";
import type { PrintifyProduct } from "./printify";
import { createClient } from "@supabase/supabase-js";

interface ProductOverride {
  product_id: string;
  source: "printful" | "printify";
  custom_title: string | null;
  featured_image: string | null;
  featured_color: string | null;
  is_hidden: boolean;
}

async function getProductOverrides(): Promise<Map<string, ProductOverride>> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase.from("product_overrides").select("*");
    const map = new Map<string, ProductOverride>();
    for (const o of data ?? []) map.set(o.product_id, o);
    return map;
  } catch {
    return new Map();
  }
}

export type CommonProduct = {
  id: string | number;
  name: string;
  thumbnail_url: string;
  variants: number;
  synced: number;
  starting_price: string | null;
  best_image: string;
  catalog_type_name: string | null;
  _source: "printful" | "printify";
  _raw?: PrintifyProduct;
  /** All mockup images with variant associations (Printify) */
  all_images?: Array<{ src: string; variant_ids: number[] }>;
  /** Unique color names for the product (Printify) */
  colors?: string[];
  /** Featured color override from dashboard */
  featured_color?: string | null;
};

/** Fetch all products respecting the active pod_provider setting, with admin overrides applied. */
export async function getStoreProducts(): Promise<CommonProduct[]> {
  const general = await getSettingsSection("general");
  const provider = (general.pod_provider ?? "printful").toLowerCase();

  const usePrintful = provider === "printful" || provider === "both";
  const usePrintify = provider === "printify" || provider === "both";

  const [printfulList, printifyList, overrides] = await Promise.all([
    usePrintful ? getPrintfulProducts().catch((e) => { console.error("[products] Printful error:", e.message); return []; }) : Promise.resolve([]),
    usePrintify ? getPrintifyProducts().catch((e) => { console.error("[products] Printify error:", e.message); return []; }) : Promise.resolve([]),
    getProductOverrides(),
  ]);

  const all: CommonProduct[] = [
    ...printfulList.map((p) => ({ ...p, id: p.id, name: p.name, _source: "printful" as const })),
    ...printifyList.map((p) => toPrintifyCommonProduct(p)),
  ];

  // Apply admin overrides and filter hidden products
  return all
    .map((p) => {
      const override = overrides.get(String(p.id));
      if (!override) return p;
      return {
        ...p,
        name: override.custom_title ?? p.name,
        best_image: override.featured_image ?? p.best_image,
        thumbnail_url: override.featured_image ?? p.thumbnail_url,
        featured_color: override.featured_color ?? null,
      };
    })
    .filter((p) => {
      const override = overrides.get(String(p.id));
      return !override?.is_hidden;
    });
}

export type StoreProductDetail =
  | { source: "printful"; data: PrintfulProductDetail }
  | { source: "printify"; data: PrintifyProduct };

/** Fetch a single product by its store ID (numeric = Printful, "printify_xxx" = Printify). */
export async function getStoreProduct(id: string): Promise<StoreProductDetail> {
  if (id.startsWith("printify_")) {
    const shopId = await getPrintifyShopId();
    const data = await getPrintifyProduct(shopId, id.replace("printify_", ""));
    return { source: "printify", data };
  }
  const data = await getPrintfulProduct(id);
  return { source: "printful", data };
}
