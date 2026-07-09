"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Package,
  ChevronDown,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice, cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import type { PrintfulProductDetail } from "@/lib/printful";

interface ProductClientProps {
  product: PrintfulProductDetail;
}

export default function ProductClient({ product }: ProductClientProps) {
  const { sync_product, sync_variants } = product;
  const [selectedVariant, setSelectedVariant] = useState(sync_variants[0]);
  const [selectedImage, setSelectedImage] = useState(
    sync_variants[0]?.files?.find((f) => f.type === "preview")?.preview_url ||
      sync_product.thumbnail_url
  );
  const [quantity, setQuantity] = useState(1);
  const [wishlist, setWishlist] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const previewImages = Array.from(
    new Set(
      sync_variants
        .flatMap((v) => v.files)
        .filter((f) => f.type === "preview")
        .map((f) => f.preview_url)
        .filter(Boolean)
    )
  ).slice(0, 6);

  if (previewImages.length === 0 && sync_product.thumbnail_url) {
    previewImages.push(sync_product.thumbnail_url);
  }

  const sizes = Array.from(
    new Set(
      sync_variants
        .flatMap((v) => v.options)
        .filter((o) => o.id === "size")
        .map((o) => o.value)
    )
  );

  const colors = Array.from(
    new Set(
      sync_variants
        .flatMap((v) => v.options)
        .filter((o) => o.id === "color")
        .map((o) => o.value)
    )
  );

  function handleAddToCart() {
    addItem({
      variantId: selectedVariant.id,
      productId: selectedVariant.product_id,
      name: `${sync_product.name} — ${selectedVariant.name}`,
      price: parseFloat(selectedVariant.retail_price),
      currency: selectedVariant.currency,
      imageUrl: selectedImage || "",
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-8">
          <Link href="/" className="hover:text-zinc-300 transition-colors">
            Home
          </Link>
          <ChevronDown className="h-3 w-3 -rotate-90" />
          <Link href="/shop" className="hover:text-zinc-300 transition-colors">
            Shop
          </Link>
          <ChevronDown className="h-3 w-3 -rotate-90" />
          <span className="text-zinc-300 truncate max-w-[200px]">
            {sync_product.name}
          </span>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Images */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
              <Image
                src={selectedImage || "/placeholder-product.jpg"}
                alt={sync_product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
            {previewImages.length > 1 && (
              <div className="grid grid-cols-6 gap-2">
                {previewImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                      selectedImage === img
                        ? "border-brand-500"
                        : "border-zinc-800 hover:border-zinc-600"
                    )}
                  >
                    <Image
                      src={img}
                      alt={`View ${i + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100 sm:text-4xl">
                {sync_product.name}
              </h1>
              <div className="mt-3 flex items-center gap-4">
                <p className="text-2xl font-bold text-brand-400">
                  {formatPrice(
                    parseFloat(selectedVariant?.retail_price || "0"),
                    selectedVariant?.currency
                  )}
                </p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        "h-4 w-4",
                        s <= 4
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-700"
                      )}
                    />
                  ))}
                  <span className="text-sm text-zinc-500 ml-1">(42 reviews)</span>
                </div>
              </div>
            </div>

            {sync_product.description && (
              <p className="text-zinc-400 leading-relaxed">
                {sync_product.description}
              </p>
            )}

            {/* Color picker */}
            {colors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-3">
                  Color: <span className="text-zinc-100">Select a color</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      title={color}
                      className="h-8 w-8 rounded-full border-2 border-zinc-700 hover:border-brand-500 transition-colors"
                      style={{ backgroundColor: color.toLowerCase() }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size picker */}
            {sizes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-3">
                  Size: <span className="text-zinc-100">Select a size</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-brand-500 hover:text-brand-300"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Variant picker */}
            {sync_variants.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Variant
                </label>
                <select
                  className="input"
                  onChange={(e) => {
                    const v = sync_variants.find(
                      (va) => va.id === Number(e.target.value)
                    );
                    if (v) setSelectedVariant(v);
                  }}
                >
                  {sync_variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {formatPrice(v.retail_price, v.currency)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="btn-secondary !px-3 !py-2"
                >
                  −
                </button>
                <span className="w-12 text-center font-semibold text-zinc-100">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="btn-secondary !px-3 !py-2"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={handleAddToCart}
                className="flex-1"
              >
                <ShoppingCart className="h-5 w-5" />
                {added ? "Added to Cart!" : "Add to Cart"}
              </Button>
              <button
                onClick={() => setWishlist(!wishlist)}
                className={cn(
                  "btn-secondary !px-4",
                  wishlist && "!border-brand-600 !text-brand-400"
                )}
                aria-label="Add to wishlist"
              >
                <Heart
                  className={cn("h-5 w-5", wishlist && "fill-brand-500")}
                />
              </button>
              <button className="btn-secondary !px-4" aria-label="Share">
                <Share2 className="h-5 w-5" />
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-800">
              {[
                { icon: Truck, text: "Free shipping over $50" },
                { icon: ShieldCheck, text: "Secure payment" },
                { icon: RotateCcw, text: "30-day returns" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <Icon className="h-5 w-5 text-brand-400" />
                  <span className="text-xs text-zinc-500">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
