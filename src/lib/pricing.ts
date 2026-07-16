import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type PricingMode = "fixed" | "markup" | "percentage" | "margin";

export interface PricingRule {
  id: number;
  scope: "global" | "product";
  catalog_product_id: number | null;
  mode: PricingMode;
  value: number;
}

/** Apply a single pricing rule to a Printful cost basis. */
export function applyPricingRule(cost: number, mode: PricingMode, value: number): number {
  switch (mode) {
    case "fixed":
      return value;
    case "markup":
      return cost + value;
    case "percentage":
      return cost * value;
    case "margin":
      // value is a profit margin fraction (0-1), e.g. 0.35 = 35% margin
      return value >= 1 ? cost : cost / (1 - value);
    default:
      return cost;
  }
}

/**
 * Resolve the retail price for a catalog product given its Printful cost basis.
 * Priority: product-specific rule > global rule > provided fallback.
 * Never returns the raw Printful retail price — always derived from cost.
 */
export async function resolvePrice(params: {
  cost: number | null;
  catalogProductId: number;
  fallback: string | number;
}): Promise<{ price: string; source: "product" | "global" | "fallback" }> {
  const fallbackNum = typeof params.fallback === "string" ? parseFloat(params.fallback) : params.fallback;
  const fallbackPrice = Number.isFinite(fallbackNum) ? fallbackNum : 24.99;

  if (params.cost == null || !Number.isFinite(params.cost)) {
    return { price: fallbackPrice.toFixed(2), source: "fallback" };
  }

  const { data: rules } = await db
    .from("pricing_rules")
    .select("id, scope, catalog_product_id, mode, value")
    .or(`scope.eq.global,catalog_product_id.eq.${params.catalogProductId}`);

  const productRule = (rules ?? []).find(
    (r: PricingRule) => r.scope === "product" && r.catalog_product_id === params.catalogProductId
  );
  const globalRule = (rules ?? []).find((r: PricingRule) => r.scope === "global");

  if (productRule) {
    return { price: applyPricingRule(params.cost, productRule.mode, productRule.value).toFixed(2), source: "product" };
  }
  if (globalRule) {
    return { price: applyPricingRule(params.cost, globalRule.mode, globalRule.value).toFixed(2), source: "global" };
  }
  return { price: fallbackPrice.toFixed(2), source: "fallback" };
}
