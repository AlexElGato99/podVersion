"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Heart, Star, ShoppingCart } from "lucide-react";
import { cn, productSlug } from "@/lib/utils";

interface ProductCardProps {
  id: number;
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
  const [imgSrc, setImgSrc] = useState(imageUrl || "/placeholder-product.jpg");

  return (
    <Link
      href={`/shop/${productSlug(name, id)}`}
      className={cn("group relative flex flex-col bg-white", className)}
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
          <span className="absolute left-2.5 top-2.5 rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
            {badge}
          </span>
        )}

        {/* Heart / wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); setLiked(!liked); }}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow transition-all hover:scale-110 active:scale-95"
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={cn("h-4 w-4 transition-colors", liked ? "fill-red-500 text-red-500" : "text-zinc-400")}
          />
        </button>

        {/* Quick add overlay on hover */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <div className="m-2 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900/90 backdrop-blur-sm py-2.5 text-xs font-semibold text-white">
            <ShoppingCart className="h-3.5 w-3.5" />
            Add to cart
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="pt-3 px-0.5 pb-1">
        <p className="text-sm text-zinc-700 line-clamp-2 leading-snug group-hover:text-zinc-900 transition-colors">
          {name}
        </p>

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

        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          {price > 0 ? (
            <span className="text-sm font-semibold text-zinc-900">
              ${price.toFixed(2)}
            </span>
          ) : (
            <span className="text-xs text-zinc-400 italic">Price on request</span>
          )}
          {freeShipping && (
            <span className="text-[11px] font-medium text-accent-600">Free shipping</span>
          )}
        </div>
      </div>
    </Link>
  );
}
