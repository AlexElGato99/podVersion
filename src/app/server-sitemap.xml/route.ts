import { getServerSideSitemap } from "next-sitemap";
import { getProducts } from "@/lib/printful";
import { productSlug } from "@/lib/utils";

export async function GET() {
  const baseUrl = process.env.SITE_URL || "https://printdrop.com";
  try {
    const products = await getProducts();
    const fields = products.map((p) => ({
      loc: `${baseUrl}/shop/${productSlug(p.name, p.id)}`,
      lastmod: new Date().toISOString(),
      changefreq: "weekly" as const,
      priority: 0.8,
    }));
    return getServerSideSitemap(fields);
  } catch {
    return getServerSideSitemap([]);
  }
}
