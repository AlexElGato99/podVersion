"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  productId: string;
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

export default function ProductClient({ product, productId }: ProductClientProps) {
  const { sync_product, sync_variants, all_images } = product;
  const { addItem } = useCart();

  const displayName        = sync_product.name;
  const displayDescription = sync_product.description;

  // Map: color → { hexCode, mockupImage, shirtImage }
  // mockupImage = real Printful-generated preview with your design (only some colors)
  // shirtImage  = catalog photo of the blank shirt in this color (all colors)
  const colorDataMap = useMemo(() => {
    const map = new Map<string, { hexCode: string | null; mockupImage: string | null; shirtImage: string | null }>();
    for (const v of sync_variants) {
      if (!v.color) continue;
      if (!map.has(v.color)) {
        const mockup = v.files?.find((f) => f.type === "preview" && f.preview_url)?.preview_url ?? null;
        map.set(v.color, {
          hexCode:    v.color_code ?? null,
          mockupImage: mockup,
          shirtImage:  v.product?.image ?? null,
        });
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

  const useCompactSizePicker = useMemo(() => {
    if (sizes.length < 7) return false;
    return sizes.some((size) => /\d+\s*["']?\s*[x×]\s*\d+/i.test(size));
  }, [sizes]);

  const isPhoneCaseProduct = useMemo(() => {
    const text = `${displayName} ${sizes.join(" ")}`.toLowerCase();
    return /\b(phone|iphone|galaxy|samsung|pixel)\b/.test(text) && /\bcase\b/.test(text);
  }, [displayName, sizes]);

  const useSizeDropdown = useCompactSizePicker || isPhoneCaseProduct;
  const sizeOptionLabel = isPhoneCaseProduct ? "Device" : "Size";
  const sizeDropdownLabel = isPhoneCaseProduct ? "Choose your device" : "Choose a size";

  // Unique color names in the order they appear

  const hasColors = colors.length > 0;
  const hasSizes  = sizes.length > 0;

  const defaultColor = useMemo(() => {
    return colors[0] ?? "";
  }, [colors]);

  const [selectedColor, setSelectedColor] = useState<string>(defaultColor);
  const [selectedSize,  setSelectedSize]  = useState<string>(sizes[0] ?? "");
  // null = derive from selected color; string = user explicitly picked a gallery thumbnail
  const [pinnedImage, setPinnedImage] = useState<string | null>(null);

  useEffect(() => {
    if (defaultColor) setSelectedColor(defaultColor);
  }, [defaultColor]);

  useEffect(() => {
    if (sizes.length > 0 && !sizes.includes(selectedSize)) setSelectedSize(sizes[0]);
  }, [sizes, selectedSize]);

  const selectedVariant = useMemo(() => {
    if (!hasColors && !hasSizes) return sync_variants[0];
    return sync_variants.find((v) => {
      const colorMatch = !hasColors || v.color === selectedColor;
      const sizeMatch  = !hasSizes  || v.size  === selectedSize;
      return colorMatch && sizeMatch;
    }) ?? sync_variants[0];
  }, [sync_variants, selectedColor, selectedSize, hasColors, hasSizes]);

  const selectedVariantImage = selectedVariant?.files?.find((f) => f.type === "preview" && f.preview_url)?.preview_url ?? null;

  // Derive main image: pinned > selected variant preview > color mockup > thumbnail
  const derivedImage = (() => {
    const cd = colorDataMap.get(selectedColor);
    return selectedVariantImage ?? cd?.mockupImage ?? cd?.shirtImage ?? sync_product.thumbnail_url ?? "";
  })();
  const displayImage = pinnedImage ?? derivedImage;

  // When color changes, pin the first gallery image for the new color
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    // Will be resolved after galleryImages recomputes — clear pin so derivedImage takes over
    setPinnedImage(null);
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    setPinnedImage(null);
  };

  // Variant IDs for the image gallery. Apparel stays color-scoped; device-style
  // variants such as phone cases also scope by the selected size/device.
  const shouldFilterGalleryBySize = isPhoneCaseProduct || (!hasColors && hasSizes);

  const selectedGalleryVariantIds = useMemo(() => {
    const ids = new Set<number>();
    for (const v of sync_variants) {
      const colorMatch = !hasColors || v.color === selectedColor;
      const sizeMatch = !shouldFilterGalleryBySize || !hasSizes || v.size === selectedSize;
      if (colorMatch && sizeMatch) ids.add(v.id);
    }
    return ids;
  }, [sync_variants, selectedColor, selectedSize, hasColors, hasSizes, shouldFilterGalleryBySize]);

  // Gallery: all_images (Printify, filtered to selected options) OR per-color mockups (Printful)
  const galleryImages: string[] = useMemo(() => {
    if (all_images && all_images.length > 0) {
      const optionImgs = all_images
        .filter((img) => !img.variant_ids.length || img.variant_ids.some((id) => selectedGalleryVariantIds.has(id)))
        .map((img) => img.src);
      // If option filtering yields images, use them; otherwise show all (no variant mappings)
      if (optionImgs.length > 0) return optionImgs;
      return all_images.map((img) => img.src);
    }
    // Printful: collect unique mockups per color
    const seen = new Set<string>();
    const imgs: string[] = [];
    for (const [, cd] of colorDataMap) {
      const src = cd.mockupImage ?? cd.shirtImage;
      if (src && !seen.has(src)) { seen.add(src); imgs.push(src); }
    }
    if (sync_product.thumbnail_url && !seen.has(sync_product.thumbnail_url)) imgs.push(sync_product.thumbnail_url);
    return imgs;
  }, [all_images, selectedGalleryVariantIds, colorDataMap, sync_product.thumbnail_url]);

  useEffect(() => {
    setPinnedImage(galleryImages[0] ?? null);
  }, [galleryImages]);

  const [quantity, setQuantity] = useState(1);
  const [wishlist, setWishlist] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [added, setAdded] = useState(false);

  const activeGalleryIndex = useMemo(() => {
    if (!galleryImages.length) return -1;
    const idx = galleryImages.indexOf(displayImage);
    return idx >= 0 ? idx : 0;
  }, [galleryImages, displayImage]);

  const moveGallery = (direction: -1 | 1) => {
    if (galleryImages.length < 2) return;
    const current = activeGalleryIndex >= 0 ? activeGalleryIndex : 0;
    const nextIndex = (current + direction + galleryImages.length) % galleryImages.length;
    setPinnedImage(galleryImages[nextIndex]);
  };

  useEffect(() => {
    let cancelled = false;
    async function loadWishlistState() {
      try {
        const res = await fetch(`/api/wishlist?product_id=${encodeURIComponent(productId)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setWishlist(!!json.liked);
      } catch {
        // non-auth users keep default state
      }
    }
    loadWishlistState();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function toggleWishlist(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (wishlistBusy) return;
    const next = !wishlist;
    setWishlistBusy(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          next
            ? {
                product_id: productId,
                product_name: displayName,
                image_url: displayImage || sync_product.thumbnail_url || null,
                price: Number.isFinite(price) ? price : null,
                currency,
                source: productId.startsWith("printify_") ? "printify" : "printful",
              }
            : { product_id: productId }
        ),
      });

      if (res.status === 401) {
        window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (!res.ok) return;
      setWishlist(next);
    } catch {
      // keep state unchanged on network error
    } finally {
      setWishlistBusy(false);
    }
  }

  function handleAddToCart() {
    addItem({
      variantId: selectedVariant.id,
      productId: selectedVariant.sync_product_id,
      name: `${displayName} — ${selectedVariant.name}`,
      price: parseFloat(selectedVariant.retail_price),
      currency: selectedVariant.currency,
      imageUrl: displayImage,
      quantity,
      color: selectedVariant.color ?? undefined,
      size: selectedVariant.size ?? undefined,
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
              <span className="truncate max-w-[220px]">{displayName}</span>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-stretch xl:gap-16">
          {/* Image gallery */}
          <div className="flex flex-col gap-3 lg:h-full">
            {/* Main image */}
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100">
              <Image
                src={displayImage || "/placeholder-product.jpg"}
                alt={`${displayName}${selectedColor ? ` in ${selectedColor}` : ""}`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-opacity duration-300"
                priority
                unoptimized
              />
              <button
                onClick={toggleWishlist}
                disabled={wishlistBusy}
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

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => moveGallery(-1)}
                    aria-label="Previous product image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 border border-zinc-200 text-zinc-700 shadow-sm hover:bg-white transition-colors flex items-center justify-center"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveGallery(1)}
                    aria-label="Next product image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 border border-zinc-200 text-zinc-700 shadow-sm hover:bg-white transition-colors flex items-center justify-center"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {galleryImages.map((src, i) => {
                  const isActive = (pinnedImage ?? derivedImage) === src;
                  return (
                    <button
                      key={i}
                      onClick={() => setPinnedImage(src === derivedImage && !pinnedImage ? null : src)}
                      className={cn(
                        "relative shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition-all duration-150 focus:outline-none",
                        isActive
                          ? "border-brand-600 ring-2 ring-brand-200"
                          : "border-zinc-200 hover:border-zinc-400"
                      )}
                      aria-label={`View image ${i + 1}`}
                    >
                      <Image
                        src={src}
                        alt={`${displayName} mockup ${i + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                        sizes="64px"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Features grid */}
            <div className="mt-auto grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100">
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

          {/* Product details */}
          <div className="flex flex-col gap-6 lg:h-full lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-1">PrintDrop Original</p>
              <h1 className="text-3xl font-extrabold leading-tight text-zinc-900 sm:text-[34px]">
                {displayName}
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

            {/* Product info tabs (compact, inside right column) */}
            <ProductInfoTabs description={displayDescription} productName={displayName} compact />



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
                        onClick={() => handleColorChange(color)}
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

            {/* Size / device picker */}
            {hasSizes && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-zinc-800">
                    {sizeOptionLabel}: <span className="font-normal text-zinc-500">{selectedSize}</span>
                  </p>
                  {!isPhoneCaseProduct && (
                    <button className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">
                      <Info className="h-3.5 w-3.5" />
                      Size guide
                    </button>
                  )}
                </div>
                {useSizeDropdown ? (
                  <div className="rounded-2xl border border-zinc-200 bg-linear-to-br from-zinc-50 to-white p-3.5 shadow-sm">
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      {sizeDropdownLabel}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedSize}
                        onChange={(e) => handleSizeChange(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-zinc-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        {sizes.map((size) => {
                          const available = sync_variants.some((v) => {
                            const colorOk = !hasColors || v.color === selectedColor;
                            const sizeOk = v.size === size;
                            return colorOk && sizeOk;
                          });
                          return (
                            <option key={size} value={size} disabled={!available}>
                              {size}{available ? "" : " - Unavailable"}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                      <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                        {isPhoneCaseProduct ? "Required" : "Space-saving"}
                      </span>
                      <span>
                        {isPhoneCaseProduct
                          ? "Pick the exact phone model before adding to cart."
                          : "Best for wall art and large dimension sets."}
                      </span>
                    </div>
                  </div>
                ) : (
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
                          onClick={() => available && handleSizeChange(size)}
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
                )}
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
                onClick={toggleWishlist}
                disabled={wishlistBusy}
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

          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Description parser ──────────────────────────────────── */

/**
 * Parses the product description HTML from Printify / Printful into named
 * sections. Printify descriptions follow the pattern:
 *
 *   Intro text...<br/><br/>
 *   Product features<br/>- item<br/>- item<br/><br/>
 *   Care instructions<br/>- Machine wash...<br/>
 *
 * We normalise the raw HTML into text, split on known section headers, then
 * return each section as trimmed HTML so we can render it directly.
 */
function parseDescriptionSections(html: string): {
  intro: string;
  features: string[];
  care: string[];
  extra: string;
  table: string;
} {
  if (!html) return { intro: "", features: [], care: [], extra: "", table: "" };

  // Keep only one size guide table to avoid duplicate guides.
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  const uniqueTables: string[] = [];
  const seenTables = new Set<string>();
  for (const t of tableMatches) {
    const normalized = t.replace(/\s+/g, " ").trim().toLowerCase();
    if (!seenTables.has(normalized)) {
      seenTables.add(normalized);
      uniqueTables.push(t);
    }
  }
  const table = uniqueTables[0] ?? "";

  // Remove all table blocks before converting to plain text.
  const htmlWithoutTable = html.replace(/<table[\s\S]*?<\/table>/gi, "");

  // Convert to plain text (preserve newlines from <br/>)
  const text = htmlWithoutTable
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const FEATURE_HEADERS = /^product features?$/i;
  const CARE_HEADERS    = /^care instructions?$/i;

  const result = { intro: "", features: [] as string[], care: [] as string[], extra: "", table };
  let section: "intro" | "features" | "care" | "extra" = "intro";
  const introBuf: string[] = [];
  const extraBuf: string[] = [];

  for (const line of lines) {
    if (FEATURE_HEADERS.test(line)) { section = "features"; continue; }
    if (CARE_HEADERS.test(line))    { section = "care";     continue; }

    // Bullet items start with "- " or "• "
    const bullet = line.replace(/^[-•]\s*/, "");

    if (section === "intro")     { introBuf.push(line); }
    else if (section === "features") {
      if (bullet !== line || result.features.length > 0) result.features.push(bullet);
      else introBuf.push(line); // text before first bullet → intro
    }
    else if (section === "care") { result.care.push(bullet); }
    else                         { extraBuf.push(line); }

    // Once we've seen "Care instructions" header, subsequent non-bullet content goes to extra
    if (section === "care" && bullet === line && result.care.length === 0) {
      section = "extra";
      extraBuf.push(line);
      result.care.pop();
    }
  }

  result.intro = introBuf.join("\n\n");
  result.extra = extraBuf.join("\n\n");
  return result;
}

/* ─── FAQ (static — shipping/returns don't come from the product API) ─── */

const FAQ_ITEMS = [
  {
    q: "How long does shipping take?",
    a: "Orders are printed and dispatched within 2–5 business days. Standard US shipping takes an additional 3–5 business days. Most customers receive their order within 7–10 business days.",
  },
  {
    q: "What is your return policy?",
    a: "We offer a 30-day no-questions-asked return policy. If your item arrives damaged, misprinted, or defective, we'll send a replacement or full refund — no return shipping needed.",
  },
  {
    q: "What printing method is used?",
    a: "Products are printed using Direct-to-Garment (DTG) printing or embroidery depending on the item, fulfilled by Printful. DTG produces vibrant, long-lasting prints that won't crack or fade.",
  },
  {
    q: "How should I wash this product?",
    a: "For best results, wash inside-out in cold water on a gentle cycle. Tumble dry on low heat or hang to dry. Avoid bleach and ironing directly on the print.",
  },
  {
    q: "Do you ship internationally?",
    a: "We currently focus on US orders for the fastest delivery experience. International shipping may be available at checkout — shipping times vary by country.",
  },
];

const TABS = ["Description", "Features", "Care Instructions", "Size Guide", "FAQ"] as const;
type TabId = (typeof TABS)[number];

function ProductInfoTabs({
  description,
  productName,
  compact = false,
}: {
  description: string;
  productName: string;
  compact?: boolean;
}) {
  const [active, setActive] = useState<TabId>("Description");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const sections = useMemo(() => parseDescriptionSections(description), [description]);
  const sizeGuideHtml = useMemo(() => {
    if (!sections.table) return "";
    return sections.table
      .replace(/\sstyle=(['"]).*?\1/gi, "")
      .replace(/<table/gi, '<table class="size-guide-table"');
  }, [sections.table]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": { "@type": "Answer", "text": item.a },
    })),
  };

  // Only show tabs that have content
  const visibleTabs = TABS.filter((tab) => {
    if (tab === "Description") return !!sections.intro;
    if (tab === "Features")    return sections.features.length > 0;
    if (tab === "Care Instructions") return sections.care.length > 0;
    if (tab === "Size Guide") return !!sections.table;
    return true; // FAQ always shown
  });

  // If active tab became hidden, fall back to first visible
  const resolvedActive = (visibleTabs as readonly string[]).includes(active)
    ? active
    : visibleTabs[0] ?? "FAQ";

  return (
    <section className={cn(
      compact
        ? "p-0"
        : "mt-16 border-t border-zinc-100 pt-10 max-w-4xl mx-auto"
    )}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Tab strip */}
      <div className={cn(
        "flex flex-wrap border-b border-zinc-200",
        compact ? "gap-1 mb-4" : "gap-2 mb-8"
      )}>
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={cn(
              "font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px",
              compact ? "px-3 py-2 text-xs" : "px-6 py-3 text-sm",
              resolvedActive === tab
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className={cn("w-full", compact ? "max-w-none" : "max-w-2xl") }>
      {resolvedActive === "Description" && (
        <div className={cn(compact ? "max-w-none" : "max-w-3xl")}>
          <p className={cn("text-zinc-600 leading-relaxed whitespace-pre-line", compact ? "text-xs" : "text-sm")}>
            {sections.intro}
          </p>
          {sections.extra && (
            <p className={cn("text-zinc-500 leading-relaxed whitespace-pre-line", compact ? "text-xs mt-2.5" : "text-sm mt-4")}>
              {sections.extra}
            </p>
          )}
        </div>
      )}

      {resolvedActive === "Features" && (
        <ul className={cn(compact ? "max-w-none space-y-2" : "max-w-2xl space-y-3")}>
          {sections.features.map((feat, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 h-5 w-5 flex items-center justify-center rounded-full bg-orange-50 shrink-0">
                <Check className="h-3 w-3 text-orange-600" strokeWidth={3} />
              </span>
              <span className={cn("text-zinc-700 leading-relaxed", compact ? "text-xs" : "text-sm")}>{feat}</span>
            </li>
          ))}
        </ul>
      )}

      {resolvedActive === "Care Instructions" && (
        <ul className={cn(compact ? "max-w-none space-y-2" : "max-w-2xl space-y-3")}>
          {sections.care.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 h-5 w-5 flex items-center justify-center rounded-full bg-orange-50 shrink-0">
                <Check className="h-3 w-3 text-orange-600" strokeWidth={3} />
              </span>
              <span className={cn("text-zinc-700 leading-relaxed", compact ? "text-xs" : "text-sm")}>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {resolvedActive === "Size Guide" && sections.table && (
        <div className={cn(compact ? "max-w-none text-xs" : "max-w-3xl text-sm", "overflow-x-auto text-zinc-700")}>
          <style>{`
            .size-guide-table {
              width: 100%;
              border-collapse: collapse;
              margin: 0;
            }
            .size-guide-table thead {
              background-color: #f3f4f6;
              border-bottom: 1px solid #f3f4f6;
            }
            .size-guide-table th {
              padding: 4px 6px;
              text-align: left;
              font-weight: 500;
              font-size: inherit;
              line-height: inherit;
              color: #374151;
              white-space: nowrap;
            }
            .size-guide-table tbody tr {
              border-bottom: 1px solid #f9fafb;
            }
            .size-guide-table tbody tr:last-child {
              border-bottom: none;
            }
            .size-guide-table td {
              padding: 3px 6px;
              font-size: inherit;
              line-height: inherit;
              color: #6b7280;
            }
            .size-guide-table tbody tr:hover {
              background-color: #f9fafb;
            }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: sizeGuideHtml }} />
        </div>
      )}

      {resolvedActive === "FAQ" && (
        <div className={cn(compact ? "max-w-none" : "max-w-2xl")}>
          <h2 className={cn("font-bold text-zinc-900", compact ? "text-sm mb-3" : "text-base mb-5")}>
            Frequently asked questions about {productName}
          </h2>
          <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 overflow-hidden">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx}>
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className={cn(
                    "w-full flex items-center justify-between gap-4 text-left hover:bg-zinc-50 transition-colors",
                    compact ? "px-3 py-2.5" : "px-5 py-4"
                  )}
                >
                  <span className={cn("font-semibold text-zinc-800", compact ? "text-xs" : "text-sm")}>{item.q}</span>
                </button>
                {openFaq === idx && (
                  <div className={cn(compact ? "px-3 pb-3" : "px-5 pb-5")}>
                    <p className={cn("text-zinc-600 leading-relaxed", compact ? "text-xs" : "text-sm")}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
