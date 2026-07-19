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
};

/** Fetch all products respecting the active pod_provider setting. */
export async function getStoreProducts(): Promise<CommonProduct[]> {
  const general = await getSettingsSection("general");
  const provider = (general.pod_provider ?? "printful").toLowerCase();

  // Debug log so you can see in the server console exactly what's happening
  console.log(`[products] pod_provider=${provider}`);

  const usePrintful = provider === "printful" || provider === "both";
  const usePrintify = provider === "printify" || provider === "both";

  const [printfulList, printifyList] = await Promise.all([
    usePrintful ? getPrintfulProducts().catch((e) => { console.error("[products] Printful error:", e.message); return []; }) : Promise.resolve([]),
    usePrintify ? getPrintifyProducts().catch((e) => { console.error("[products] Printify error:", e.message); return []; }) : Promise.resolve([]),
  ]);

  console.log(`[products] Printful: ${printfulList.length} products, Printify: ${printifyList.length} products`);

  return [
    ...printfulList.map((p) => ({ ...p, id: p.id, name: p.name, _source: "printful" as const })),
    ...printifyList.map((p) => toPrintifyCommonProduct(p)),
  ];
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
