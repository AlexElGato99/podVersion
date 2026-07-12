"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Package,
  ShieldCheck,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice, cn } from "@/lib/utils";

export default function CartPage() {
  const { items, totalItems, totalPrice, removeItem, updateQuantity, clearCart } =
    useCart();

  if (items.length === 0) {
    return (
      <div className="pt-24 pb-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 rounded-3xl bg-zinc-100 flex items-center justify-center mb-6">
            <ShoppingCart className="h-12 w-12 text-zinc-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-3">
            Your cart is empty
          </h1>
          <p className="text-zinc-500 mb-8">
            Looks like you haven&apos;t added anything yet.
          </p>
          <Link href="/shop" className="btn-primary">
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-bold text-zinc-900">
            Shopping Cart
            <span className="ml-3 text-lg font-normal text-zinc-500">
              ({totalItems} {totalItems === 1 ? "item" : "items"})
            </span>
          </h1>
          <button
            onClick={clearCart}
            className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4" />
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.variantId}
                className="card flex gap-4 p-4 transition-all hover:border-zinc-300"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                  <Image
                    src={item.imageUrl || "/placeholder-product.jpg"}
                    alt={item.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-zinc-900 text-sm line-clamp-2">
                      {item.name}
                    </h3>
                    <button
                      onClick={() => removeItem(item.variantId)}
                      className="shrink-0 text-zinc-600 hover:text-red-400 transition-colors p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.variantId, item.quantity - 1)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center font-semibold text-zinc-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.variantId, item.quantity + 1)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="font-bold text-brand-600">
                      {formatPrice(item.price * item.quantity, item.currency)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div>
            <div className="card p-6 sticky top-24">
              <h2 className="text-lg font-bold text-zinc-900 mb-6">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Shipping</span>
                  <span className="text-green-400">
                    {totalPrice > 50 ? "Free" : formatPrice(4.99)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Tax (est.)</span>
                  <span>{formatPrice(totalPrice * 0.08)}</span>
                </div>
                <hr className="border-zinc-200" />
                <div className="flex justify-between text-base font-bold text-zinc-900">
                  <span>Total</span>
                  <span>
                    {formatPrice(
                      totalPrice +
                        (totalPrice > 50 ? 0 : 4.99) +
                        totalPrice * 0.08
                    )}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="btn-primary w-full mt-6 justify-center"
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/shop"
                className="btn-ghost w-full mt-3 justify-center text-zinc-500"
              >
                Continue Shopping
              </Link>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-600">
                <ShieldCheck className="h-4 w-4" />
                Secure checkout powered by Stripe
              </div>

              {totalPrice < 50 && (
                <div className="mt-4 rounded-xl bg-brand-950/40 border border-brand-800/40 p-3 text-xs text-brand-500 text-center">
                  Add {formatPrice(50 - totalPrice)} more for free shipping!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
