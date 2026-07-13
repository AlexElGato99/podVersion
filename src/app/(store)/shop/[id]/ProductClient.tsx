"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ShoppingCart,
  Heart,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Package,
  Check,
  Minus,
  Plus,
  Info,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice, cn } from "@/lib/utils";
import type { PrintfulProductDetail } from "@/lib/printful";

interface ProductClientProps {
  product: PrintfulProductDetail;
}

const LIGHT_COLORS = new Set([
  "white", "cream", "beige", "lavender", "mint", "light gray", "natural",
  "heather dust", "athletic heather", "silver",
]);

function isLightColor(hex: string, name: string): boolean {
  if (LIGHT_COLORS.has(name.toLowerCase())) return true;
  // Parse brightness from hex
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Perceived brightness
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

export default function ProductClient({ product }: ProductClientProps) {
  const { sync_product, sync_variants } = product;
  const { addItem } = useCart();

  // Map: color → { shirtImage, designImage, mockupImage }
  // shirtImage: catalog shirt in the right color (always available for all colors)
  // designImage: front_large print file (the artwork, same per product)
  // mockupImage: Printful-generated mockup with design (only available for some colors)
  const colorDataMap = useMemo(() => {
    const map = new Map<string, { shirtImage: string | null; designImage: string | null; mockupImage: string | null }>();
    for (const v of sync_variants) {
      if (!v.color) continue;
      if (!map.has(v.color)) {
        const mockup = v.files?.find((f) => f.type === "preview" && f.preview_url)?.preview_url ?? null;
        const design = v.files?.find((f) => f.type === "front_large" && f.preview_url)?.preview_url ?? null;
        const shirt  = v.product?.image ?? null;
        map.set(v.color, { shirtImage: shirt, designImage: design, mockupImage: mockup });
      }
    }
    return map;
  }, [sync_variants]);

  // Build a map of color name → { hex, hex2 } from Printful catalog data
  const colorMap = useMemo(() => {
    const map = new Map<string, { hex: string; hex2: string | null }>();
    for (const v of sync_variants) {
      if (v.color && v.color_code && !map.has(v.color)) {
        map.set(v.color, { hex: v.color_code, hex2: v.color_code2 ?? null });
      }
    }
    return map;
  }, [sync_variants]);

  // Unique colors and sizes from Printful catalog data (authoritative)
  const { colors, sizes } = useMemo(() => {
    const seenColors = new Set<string>();
    const seenSizes = new Set<string>();
    const colorList: string[] = [];
    // Preserve Printful's size order
    const SIZE_ORDER = ["XS","S","M","L","XL","2XL","3XL","4XL","5XL"];
    const otherSizes: string[] = [];

    for (const v of sync_variants) {
      if (v.color && !seenColors.has(v.color)) {
        seenColors.add(v.color);
        colorList.push(v.color);
      }
      if (v.size && !seenSizes.has(v.size)) {
        seenSizes.add(v.size);
      }
    }

    // Sort sizes in standard apparel order
    for (const s of SIZE_ORDER) {
      if (seenSizes.has(s)) otherSizes.push(s);
    }
    for (const s of seenSizes) {
      if (!SIZE_ORDER.includes(s)) otherSizes.push(s);
    }

    return { colors: colorList, sizes: otherSizes };
  }, [sync_variants]);

  // Unique color names in the order they appear

  const hasColors = colors.length > 0;
  const hasSizes  = sizes.length > 0;

  const [selectedColor, setSelectedColor] = useState<string>(colors[0] ?? "");
  const [selectedSize,  setSelectedSize]  = useState<string>(sizes[0] ?? "");

  const selectedVariant = useMemo(() => {
    if (!hasColors && !hasSizes) return sync_variants[0];
    return sync_variants.find((v) => {
      const colorMatch = !hasColors || v.color === selectedColor;
      const sizeMatch  = !hasSizes  || v.size  === selectedSize;
      return colorMatch && sizeMatch;
    }) ?? sync_variants[0];
  }, [sync_variants, selectedColor, selectedSize, hasColors, hasSizes]);

  const previewImages = useMemo(() => {
    const urls = Array.from(new Set(
      sync_variants.flatMap((v) => v.files ?? [])
        .filter((f) => f.type === "preview")
        .map((f) => f.preview_url)
        .filter(Boolean)
    )).slice(0, 8) as string[];
    if (urls.length === 0 && sync_product.thumbnail_url) urls.push(sync_product.thumbnail_url);
    return urls;
  }, [sync_variants, sync_product.thumbnail_url]);

  const [selectedImage, setSelectedImage] = useState<string>(
    sync_product.thumbnail_url ?? ""
  );
  const [quantity, setQuantity] = useState(1);
  const [wishlist, setWishlist] = useState(false);
  const [added, setAdded] = useState(false);

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
    setTimeout(() => setAdded(false), 2500);
  }

  const price = parseFloat(selectedVariant?.retail_price ?? "0");
  const currency = selectedVariant?.currency ?? "USD";

  return (
    <div className="pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1.5 text-sm text-zinc-400 mb-8">
          <Link href="/" className="hover:text-zinc-700 transition-colors">Home</Link>
          <ChevronDown className="h-3 w-3 -rotate-90 shrink-0" />
          <Link href="/shop" className="hover:text-zinc-700 transition-colors">Shop</Link>
          <ChevronDown className="h-3 w-3 -rotate-90 shrink-0" />
          <span className="text-zinc-700 font-medium truncate max-w-[220px]">{sync_product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 xl:gap-16">
          {/* Image gallery */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50">
              {(() => {
                const cd = colorDataMap.get(selectedColor);
                const src = (cd?.mockupImage ?? selectedImage) || "/placeholder-product.jpg";
                return (
                  <Image
                    src={src}
                    alt={`${sync_product.name} in ${selectedColor}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition-opacity duration-300"
                    priority
                    unoptimized
                  />
                );
              })()}
              {/* Badge when selected color has no generated mockup yet */}
              {hasColors && selectedColor && !colorDataMap.get(selectedColor)?.mockupImage && (
                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-full px-3 py-1.5 shadow-sm">
                  {colorMap.get(selectedColor)?.hex && (
                    <span className="h-3.5 w-3.5 rounded-full border border-zinc-300 shrink-0" style={{ background: colorMap.get(selectedColor)!.hex }} />
                  )}
                  <span className="text-xs font-medium text-zinc-700">{selectedColor}</span>
                </div>
              )}
              <button
                onClick={() => setWishlist(!wishlist)}
                aria-label={wishlist ? "Remove from wishlist" : "Add to wishlist"}
                className={cn(
                  "absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full shadow-md backdrop-blur-sm transition-all",
                  wishlist
                    ? "bg-red-50 text-red-500 border border-red-200"
                    : "bg-white/80 text-zinc-400 hover:text-red-400 border border-zinc-200"
                )}
              >
                <Heart className={cn("h-5 w-5", wishlist && "fill-red-500")} />
              </button>
            </div>
            {previewImages.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                {previewImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-xl border-2 transition-all duration-150",
                      selectedImage === img
                        ? "border-brand-600 shadow-sm"
                        : "border-zinc-200 hover:border-zinc-400"
                    )}
                  >
                    <Image src={img} alt={`View ${i + 1}`} fill sizes="80px" className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product details */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-1">PrintDrop Original</p>
              <h1 className="text-3xl font-extrabold leading-tight text-zinc-900 sm:text-[34px]">
                {sync_product.name}
              </h1>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn("h-4 w-4", s <= 4 ? "fill-amber-400 text-amber-400" : "fill-zinc-200 text-zinc-200")} />
                  ))}
                  <span className="ml-1.5 text-sm font-medium text-zinc-700">4.0</span>
                  <span className="ml-1 text-sm text-zinc-400">(42 reviews)</span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                  In Stock
                </span>
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-zinc-900">{formatPrice(price, currency)}</span>
              <span className="text-sm text-zinc-400 line-through">{formatPrice(price * 1.2, currency)}</span>
              <span className="text-xs font-bold text-brand-600 bg-brand-50 rounded-full px-2 py-0.5">Save 17%</span>
            </div>

            {sync_product.description && (
              <p className="text-sm text-zinc-600 leading-relaxed border-l-2 border-zinc-200 pl-3">
                {sync_product.description}
              </p>
            )}

            {/* Color picker */}
            {hasColors && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-zinc-800">
                    Color: <span className="font-normal text-zinc-500">{selectedColor}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map((color) => {
                    const colorData = colorMap.get(color);
                    const hex  = colorData?.hex  ?? "#9ca3af";
                    const hex2 = colorData?.hex2 ?? null;
                    const isSelected = color === selectedColor;
                    const isLight = isLightColor(hex, color);
                    return (
                      <button
                        key={color}
                        title={color}
                        onClick={() => {
                          setSelectedColor(color);
                          const mockup = colorDataMap.get(color)?.mockupImage;
                          if (mockup) setSelectedImage(mockup);
                        }}
                        className={cn(
                          "relative h-9 w-9 rounded-full transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2",
                          isSelected ? "ring-2 ring-offset-2 ring-brand-600 scale-110" : "hover:scale-110 ring-1 ring-zinc-300"
                        )}
                        style={
                          hex2
                            ? { background: `linear-gradient(135deg, ${hex} 50%, ${hex2} 50%)` }
                            : { backgroundColor: hex }
                        }
                        aria-pressed={isSelected}
                        aria-label={color}
                      >
                        {isSelected && (
                          <Check
                            className={cn("h-4 w-4 absolute inset-0 m-auto", isLight ? "text-zinc-800" : "text-white")}
                            strokeWidth={3}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size picker */}
            {hasSizes && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-zinc-800">
                    Size: <span className="font-normal text-zinc-500">{selectedSize}</span>
                  </p>
                  <button className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">
                    <Info className="h-3.5 w-3.5" />
                    Size guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const isSelected = size === selectedSize;
                    const available = sync_variants.some((v) => {
                      const colorOk = !hasColors || v.color === selectedColor;
                      const sizeOk  = v.size === size;
                      return colorOk && sizeOk;
                    });
                    return (
                      <button
                        key={size}
                        onClick={() => available && setSelectedSize(size)}
                        disabled={!available}
                        className={cn(
                          "relative min-w-[52px] h-11 px-4 rounded-xl text-sm font-semibold border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
                          isSelected
                            ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                            : available
                              ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-900 hover:text-zinc-900"
                              : "border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed"
                        )}
                        aria-pressed={isSelected}
                      >
                        {size}
                        {!available && (
                          <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl">
                            <span className="absolute w-[120%] h-px bg-zinc-300 rotate-12" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <p className="text-sm font-semibold text-zinc-800 mb-3">Quantity</p>
              <div className="inline-flex items-center rounded-xl border-2 border-zinc-200 overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="h-11 w-11 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="h-11 w-14 flex items-center justify-center text-sm font-bold text-zinc-900 border-x-2 border-zinc-200 tabular-nums select-none">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-11 w-11 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleAddToCart}
                className={cn(
                  "flex-1 h-12 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95",
                  added
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-900 text-white hover:bg-zinc-700"
                )}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" strokeWidth={3} />
                    Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart · {formatPrice(price * quantity, currency)}
                  </>
                )}
              </button>
              <button
                onClick={() => setWishlist(!wishlist)}
                aria-label={wishlist ? "Remove from wishlist" : "Save to wishlist"}
                className={cn(
                  "h-12 w-12 flex items-center justify-center rounded-xl border-2 transition-all duration-150 shrink-0",
                  wishlist
                    ? "border-red-200 bg-red-50 text-red-500"
                    : "border-zinc-200 text-zinc-400 hover:border-red-300 hover:text-red-400"
                )}
              >
                <Heart className={cn("h-5 w-5", wishlist && "fill-red-500")} />
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-100">
              {[
                { icon: Truck,       label: "Free Shipping",     sub: "On orders over $50" },
                { icon: ShieldCheck, label: "Secure Checkout",   sub: "SSL encrypted payment" },
                { icon: RotateCcw,   label: "30-Day Returns",    sub: "No questions asked" },
                { icon: Package,     label: "Ships in 3-5 days", sub: "Fulfilled by Printful" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50">
                  <div className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200">
                    <Icon className="h-4 w-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-800">{label}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}