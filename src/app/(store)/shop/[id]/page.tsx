import { notFound } from "next/navigation";
import { getProduct } from "@/lib/printful";
import ProductClient from "./ProductClient";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await getProduct(id);
    const name = product.sync_product.name;
    const desc = product.sync_product.description
      ? `${product.sync_product.description.slice(0, 120)}${product.sync_product.description.length > 120 ? "..." : ""} Shop now at PrintDrop — free shipping on orders $50+.`
      : `Shop ${name} at PrintDrop — premium custom print-on-demand product. Free shipping on orders $50+.`;
    return {
      title: `${name} | Custom Print-on-Demand`,
      description: desc,
      openGraph: {
        title: `${name} | PrintDrop`,
        description: desc,
      },
      twitter: {
        card: "summary_large_image",
        title: `${name} | PrintDrop`,
        description: desc,
      },
    };
  } catch {
    return { title: "Custom Print-on-Demand Product | PrintDrop" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  try {
    const product = await getProduct(id);
    return <ProductClient product={product} />;
  } catch {
    notFound();
  }
}
