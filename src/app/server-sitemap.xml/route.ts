import { getServerSideSitemap } from "next-sitemap";
import { getStoreProducts } from "@/lib/products";
import { productSlug } from "@/lib/utils";

// Always resolve the current catalog fresh — a stale/cached product list here
// means new products silently never reach Google until this route happens to
// re-render, so don't let Next.js cache this route's data fetches.
export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.SITE_URL || "https://veliova.com";
  try {
    // Provider-aware: includes both Printful and Printify products, whichever
    // the "pod_provider" setting currently has active (see src/lib/products.ts).
    const products = await getStoreProducts();
    const fields = products.map((p) => ({
      loc: `${baseUrl}/shop/${productSlug(p.name, p.id)}`,
      lastmod: new Date().toISOString(),
      changefreq: "weekly" as const,
      priority: 0.8,
    }));
    return getServerSideSitemap(fields);
  } catch (err) {
    console.error("[server-sitemap.xml] Failed to build product sitemap:", err);
    return getServerSideSitemap([]);
  }
}
