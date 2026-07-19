"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Heart, Star, Gift, ShieldCheck } from "lucide-react";
import { cn, productSlug } from "@/lib/utils";

interface ProductCardProps {
  id: number | string;
  name: string;
  price: number;
  currency?: string;
  imageUrl: string;
  badge?: string;
  rating?: number;
  reviewCount?: number;
  freeShipping?: boolean;
  className?: string;
}

export default function ProductCard({
  id,
  name,
  price,
  currency = "USD",
  imageUrl,
  badge,
  rating,
  reviewCount,
  freeShipping,
  className,
}: ProductCardProps) {
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imgSrc, setImgSrc] = useState(imageUrl || "/placeholder-product.jpg");

  const nameLower = name.toLowerCase();
  const isGiftable = /gift|mug|hoodie|sweatshirt|sticker|cap|hat/.test(nameLower);
  const styleTag = /vintage|retro/.test(nameLower)
    ? "Vintage look"
    : /minimal|clean|basic/.test(nameLower)
      ? "Minimal style"
      : "Everyday favorite";
  const compareAt = price > 0 ? price * 1.12 : 0;

  useEffect(() => {
    let cancelled = false;
    async function loadLiked() {
      try {
        const res = await fetch(`/api/wishlist?product_id=${encodeURIComponent(String(id))}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setLiked(!!json.liked);
      } catch {
        // silent: unauthenticated users keep local default state
      }
    }
    loadLiked();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function toggleWishlist(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const next = !liked;
    try {
      const res = await fetch("/api/wishlist", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          next
            ? {
                product_id: String(id),
                product_name: name,
                image_url: imgSrc,
                price,
                currency,
              }
            : { product_id: String(id) }
        ),
      });

      if (res.status === 401) {
        window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (!res.ok) return;
      setLiked(next);
    } catch {
      // keep previous state on network errors
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link
      href={`/shop/${productSlug(name, id)}`}
      className={cn(
        "group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-2.5 transition-all duration-300",
        "hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_16px_34px_-20px_rgba(234,88,12,0.45)]",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100">
        <Image
          src={imgSrc}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgSrc("/placeholder-product.jpg")}
          unoptimized
        />

        {/* Badge */}
        {badge && (
          <span className={cn(
            "absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow",
            badge === "Bestseller" ? "bg-brand-600" :
            badge === "New"        ? "bg-teal-500" :
            badge === "Popular"    ? "bg-blue-500" :
            badge === "Sale"       ? "bg-red-500" :
            "bg-brand-600"
          )}>
            {badge}
          </span>
        )}

        {/* Soft brand glow for more premium depth */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(234,88,12,0.12) 0%, rgba(234,88,12,0.02) 35%, rgba(13,148,136,0) 70%)",
          }}
        />

        {/* Heart / wishlist */}
        <button
          onClick={toggleWishlist}
          disabled={busy}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow transition-all hover:scale-110 active:scale-95"
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={cn("h-4 w-4 transition-colors", liked ? "fill-red-500 text-red-500" : "text-zinc-400")}
          />
        </button>
      </div>

      {/* Info */}
      <div className="pt-3 px-1 pb-2 space-y-2">
        <p className="text-sm text-zinc-700 line-clamp-2 leading-snug group-hover:text-zinc-900 transition-colors">
          {name}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
            {styleTag}
          </span>
          {isGiftable && (
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
              Gift-ready
            </span>
          )}
        </div>

        {/* Stars */}
        {rating !== undefined && (
          <div className="mt-1 flex items-center gap-1">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-3 w-3",
                    s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-zinc-300"
                  )}
                />
              ))}
            </div>
            {reviewCount !== undefined && (
              <span className="text-[11px] text-zinc-400">({reviewCount})</span>
            )}
          </div>
        )}

        <div className="mt-1.5 flex items-end gap-2 flex-wrap">
          {price > 0 ? (
            <>
              <span className="text-sm font-semibold text-zinc-900">
                ${price.toFixed(2)}
              </span>
              <span className="text-[11px] text-zinc-400 line-through">
                ${compareAt.toFixed(2)}
              </span>
              <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                Save 12%
              </span>
            </>
          ) : (
            <span className="text-xs text-zinc-400 italic">Price on request</span>
          )}
          {freeShipping && (
            <span className="text-[11px] font-medium text-accent-600">Free shipping</span>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
          <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-50 px-2 py-1 text-zinc-600">
            <Gift className="h-3.5 w-3.5 text-orange-600" />
            Great for gifts
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-50 px-2 py-1 text-zinc-600">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            30-day returns
          </span>
        </div>
      </div>
    </Link>
  );
}
