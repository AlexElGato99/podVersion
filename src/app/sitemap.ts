import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getStoreProducts } from "@/lib/products";
import { productSlug } from "@/lib/utils";

const SITE_URL = (process.env.SITE_URL || "https://veliova.com").replace(/\/$/, "");

// Rendered per request. `getStoreProducts()` fetches Printify with
// `cache: "no-store"`, which opts this route out of static generation
// regardless of any `revalidate` value, so it is declared explicitly rather
// than left to look like a cached route. Crawlers request a sitemap rarely,
// so the cost of a live catalogue read here is not a concern.
export const dynamic = "force-dynamic";

/** Marketing and catalogue routes that always exist. */
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/shop", priority: 0.9, changeFrequency: "daily" },
  { path: "/collections", priority: 0.8, changeFrequency: "weekly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
];

/** Published CMS pages (privacy, terms, shipping, FAQ and so on). */
async function getCmsPages(): Promise<{ slug: string; updated_at: string }[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase
      .from("pages")
      .select("slug, updated_at")
      .eq("is_published", true);
    return data ?? [];
  } catch {
    return [];
  }
}

/**
 * The site's only sitemap.
 *
 * This replaces the next-sitemap `postbuild` step, which wrote static files
 * into /public. That step was not running on deploys, so the served sitemap
 * stayed frozen for weeks and never listed any products. Generating it here
 * ties it to the normal request/build cycle, so it cannot go stale.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const cmsPages = await getCmsPages();
  for (const page of cmsPages) {
    entries.push({
      url: `${SITE_URL}/${page.slug}`,
      lastModified: page.updated_at ? new Date(page.updated_at) : now,
      changeFrequency: "monthly",
      priority: 0.4,
    });
  }

  try {
    // Provider-aware: covers Printify and Printful, whichever is active.
    const products = await getStoreProducts();
    for (const product of products) {
      entries.push({
        url: `${SITE_URL}/shop/${productSlug(product.name, product.id)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (err) {
    // A provider outage must not produce an empty sitemap that tells Google
    // the catalogue has disappeared - serve the static routes instead.
    console.error("[sitemap] Failed to load products:", err);
  }

  return entries;
}
