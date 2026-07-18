import { notFound } from "next/navigation";
import { getStoreProduct } from "@/lib/products";
import { printifyToProductDetail } from "@/lib/printify";
import ProductClient from "./ProductClient";
import type { Metadata } from "next";
import { productIdFromSlug } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const productId = productIdFromSlug(id);
  try {
    const result = await getStoreProduct(productId);
    const product = result.source === "printify" ? printifyToProductDetail(result.data) : result.data;
    const name = product.sync_product.name;
    const thumb = product.sync_variants?.[0]?.files?.find(f => f.type === "preview" && f.preview_url)?.preview_url
      ?? product.sync_product.thumbnail_url;
    const desc = product.sync_product.description
      ? `${product.sync_product.description.slice(0, 140)} Shop now at PrintDrop — free US shipping on orders $50+.`
      : `Shop ${name} at PrintDrop — premium custom print-on-demand product. Free shipping on orders $50+.`;
    return {
      title: `${name} | PrintDrop`,
      description: desc.slice(0, 160),
      openGraph: {
        title: `${name} | PrintDrop`,
        description: desc.slice(0, 160),
        images: thumb ? [{ url: thumb, width: 1200, height: 630, alt: name }] : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${name} | PrintDrop`,
        description: desc.slice(0, 160),
        images: thumb ? [thumb] : [],
      },
    };
  } catch {
    return { title: "Custom Print-on-Demand Product | PrintDrop" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const productId = productIdFromSlug(id);
  try {
    const result = await getStoreProduct(productId);
    const product = result.source === "printify" ? printifyToProductDetail(result.data) : result.data;
    const name = product.sync_product.name;
    const price = product.sync_variants?.[0]?.retail_price ?? "0";
    const thumb = product.sync_variants?.[0]?.files?.find(f => f.type === "preview" && f.preview_url)?.preview_url
      ?? product.sync_product.thumbnail_url;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": name,
      "description": product.sync_product.description ?? `${name} — custom print-on-demand product by PrintDrop.`,
      "image": thumb,
      "brand": { "@type": "Brand", "name": "PrintDrop" },
      "offers": {
        "@type": "Offer",
        "price": price,
        "priceCurrency": product.sync_variants?.[0]?.currency ?? "USD",
        "availability": "https://schema.org/InStock",
        "url": `https://printdrop.com/shop/${id}`,
        "seller": { "@type": "Organization", "name": "PrintDrop" },
      },
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://printdrop.com" },
        { "@type": "ListItem", "position": 2, "name": "Shop", "item": "https://printdrop.com/shop" },
        { "@type": "ListItem", "position": 3, "name": name, "item": `https://printdrop.com/shop/${id}` },
      ],
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        <ProductClient product={product} />
      </>
    );
  } catch {
    notFound();
  }
}
