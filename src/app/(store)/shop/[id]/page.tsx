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
      ? `${product.sync_product.description.slice(0, 140)} Shop now at Veliova — free US shipping on orders $50+.`
      : `Shop ${name} at Veliova — premium custom print-on-demand product. Free shipping on orders $50+.`;
    return {
      title: `${name} | Veliova`,
      description: desc.slice(0, 160),
      alternates: { canonical: `https://veliova.com/shop/${id}` },
      openGraph: {
        title: `${name} | Veliova`,
        description: desc.slice(0, 160),
        images: thumb ? [{ url: thumb, width: 1200, height: 630, alt: name }] : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${name} | Veliova`,
        description: desc.slice(0, 160),
        images: thumb ? [thumb] : [],
      },
    };
  } catch {
    return { title: "Custom Print-on-Demand Product | Veliova" };
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

    // Every distinct mockup image, not just the first — Google explicitly
    // recommends multiple images per product for Merchant Listing eligibility.
    const images = Array.from(new Set((product.all_images ?? []).map((img) => img.src).filter(Boolean)));
    if (images.length === 0 && thumb) images.push(thumb);

    // Real stock status rather than a hardcoded "always in stock" claim —
    // structured data must match reality, not just look complete.
    const anyVariantAvailable = product.sync_variants?.some((v) => v.availability_status === "active") ?? true;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": name,
      "description": product.sync_product.description ?? `${name} — custom print-on-demand product by Veliova.`,
      "image": images,
      "sku": String(product.sync_product.id || productId),
      "brand": { "@type": "Brand", "name": "Veliova" },
      "offers": {
        "@type": "Offer",
        "price": price,
        "priceCurrency": product.sync_variants?.[0]?.currency ?? "USD",
        "availability": anyVariantAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "url": `https://veliova.com/shop/${id}`,
        "seller": { "@type": "Organization", "name": "Veliova" },
        // Matches the trust-badge copy shown on this same page — keep in
        // sync with src/app/(store)/shop/[id]/ProductClient.tsx if that
        // copy ever changes, since structured data must reflect visible content.
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "US" },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "transitTime": { "@type": "QuantitativeValue", "minValue": 3, "maxValue": 5, "unitCode": "DAY" },
          },
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "US",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 30,
        },
      },
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://veliova.com" },
        { "@type": "ListItem", "position": 2, "name": "Shop", "item": "https://veliova.com/shop" },
        { "@type": "ListItem", "position": 3, "name": name, "item": `https://veliova.com/shop/${id}` },
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
        <ProductClient
          product={product}
          productId={productId}
          printifyShopId={result.source === "printify" ? result.data.shop_id : undefined}
        />
      </>
    );
  } catch {
    notFound();
  }
}
