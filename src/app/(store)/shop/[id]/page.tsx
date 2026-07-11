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
    return {
      title: product.sync_product.name,
      description: product.sync_product.description || "Premium print-on-demand product.",
    };
  } catch {
    return { title: "Product" };
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
