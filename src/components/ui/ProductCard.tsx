import Link from "next/link";
import Image from "next/image";
import { Star, ShoppingCart } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  currency?: string;
  imageUrl: string;
  badge?: string;
  rating?: number;
  reviewCount?: number;
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
  className,
}: ProductCardProps) {
  return (
    <Link
      href={`/shop/${id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700 hover:shadow-2xl hover:shadow-brand-950/40 hover:-translate-y-1",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-zinc-800">
        <Image
          src={imageUrl || "/placeholder-product.jpg"}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {badge && (
          <span className="absolute left-3 top-3 badge bg-brand-600/90 text-white backdrop-blur-sm">
            {badge}
          </span>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-end justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-zinc-950/80 to-transparent">
          <span className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            <ShoppingCart className="h-4 w-4" />
            View Product
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2 group-hover:text-brand-300 transition-colors">
          {name}
        </h3>

        {rating !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-3 w-3",
                    star <= Math.round(rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-zinc-700"
                  )}
                />
              ))}
            </div>
            {reviewCount !== undefined && (
              <span className="text-xs text-zinc-500">({reviewCount})</span>
            )}
          </div>
        )}

        <p className="text-base font-bold text-brand-400">
          {formatPrice(price, currency)}
        </p>
      </div>
    </Link>
  );
}
