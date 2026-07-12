"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  ShieldCheck,
  Lock,
  CreditCard,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const steps = ["Shipping", "Payment", "Review"];

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [shipping, setShipping] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  function handleShippingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep(1);
  }

  async function handlePlaceOrder() {
    setLoading(true);
    // Simulate order placement
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setCompleted(true);
    clearCart();
  }

  if (completed) {
    return (
      <div className="pt-24 pb-16 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto h-20 w-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-3">
            Order Placed!
          </h1>
          <p className="text-zinc-500 mb-8">
            Thank you for your order. You&apos;ll receive a confirmation email
            shortly with your order details and tracking information.
          </p>
          <Link href="/shop" className="btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="pt-24 pb-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-6">Your cart is empty.</p>
          <Link href="/shop" className="btn-primary">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-zinc-900 mb-6">Checkout</h1>

          {/* Step indicator */}
          <div className="flex items-center gap-0">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    i === step
                      ? "text-brand-600"
                      : i < step
                      ? "text-green-400 cursor-pointer"
                      : "text-zinc-600"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors ${
                      i === step
                        ? "border-brand-500 bg-brand-950/60 text-brand-500"
                        : i < step
                        ? "border-green-500 bg-green-950/60 text-green-300"
                        : "border-zinc-300 text-zinc-600"
                    }`}
                  >
                    {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  {s}
                </button>
                {i < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-zinc-700 mx-3" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Form area */}
          <div className="lg:col-span-2">
            {/* Step 0: Shipping */}
            {step === 0 && (
              <form onSubmit={handleShippingSubmit} className="card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Truck className="h-5 w-5 text-brand-600" />
                  <h2 className="text-lg font-bold text-zinc-900">
                    Shipping Information
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    placeholder="John"
                    value={shipping.firstName}
                    onChange={(e) =>
                      setShipping({ ...shipping, firstName: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="Last Name"
                    placeholder="Doe"
                    value={shipping.lastName}
                    onChange={(e) =>
                      setShipping({ ...shipping, lastName: e.target.value })
                    }
                    required
                  />
                  <div className="col-span-2">
                    <Input
                      label="Email"
                      type="email"
                      placeholder="john@example.com"
                      value={shipping.email}
                      onChange={(e) =>
                        setShipping({ ...shipping, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Phone (optional)"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={shipping.phone}
                      onChange={(e) =>
                        setShipping({ ...shipping, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Address"
                      placeholder="123 Main Street"
                      value={shipping.address}
                      onChange={(e) =>
                        setShipping({ ...shipping, address: e.target.value })
                      }
                      required
                    />
                  </div>
                  <Input
                    label="City"
                    placeholder="New York"
                    value={shipping.city}
                    onChange={(e) =>
                      setShipping({ ...shipping, city: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="State / Province"
                    placeholder="NY"
                    value={shipping.state}
                    onChange={(e) =>
                      setShipping({ ...shipping, state: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="ZIP / Postal Code"
                    placeholder="10001"
                    value={shipping.zip}
                    onChange={(e) =>
                      setShipping({ ...shipping, zip: e.target.value })
                    }
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                      Country
                    </label>
                    <select
                      className="input"
                      value={shipping.country}
                      onChange={(e) =>
                        setShipping({ ...shipping, country: e.target.value })
                      }
                    >
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" variant="primary" size="lg" className="mt-6 w-full justify-center">
                  Continue to Payment
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </form>
            )}

            {/* Step 1: Payment */}
            {step === 1 && (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="h-5 w-5 text-brand-600" />
                  <h2 className="text-lg font-bold text-zinc-900">
                    Payment Details
                  </h2>
                </div>
                <div className="space-y-4">
                  <Input label="Cardholder Name" placeholder="John Doe" />
                  <Input
                    label="Card Number"
                    placeholder="4111 1111 1111 1111"
                    maxLength={19}
                    icon={<CreditCard className="h-4 w-4" />}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Expiry" placeholder="MM / YY" />
                    <Input label="CVV" placeholder="123" maxLength={4} />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                  <Lock className="h-3.5 w-3.5" />
                  Your payment info is encrypted and never stored.
                </div>
                <div className="mt-6 flex gap-3">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setStep(0)}
                    className="flex-1 justify-center"
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setStep(2)}
                    className="flex-1 justify-center"
                  >
                    Review Order
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div className="card p-6">
                <h2 className="text-lg font-bold text-zinc-900 mb-6">
                  Review Your Order
                </h2>
                <div className="space-y-3 mb-6">
                  {items.map((item) => (
                    <div
                      key={item.variantId}
                      className="flex items-center gap-3"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-zinc-200">
                        <Image
                          src={item.imageUrl || "/placeholder-product.jpg"}
                          alt={item.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-brand-600">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-zinc-100/40 p-4 text-sm text-zinc-500 space-y-1.5 mb-6">
                  <p className="font-medium text-zinc-600">Shipping to:</p>
                  <p>
                    {shipping.firstName} {shipping.lastName}
                  </p>
                  <p>{shipping.address}</p>
                  <p>
                    {shipping.city}, {shipping.state} {shipping.zip},{" "}
                    {shipping.country}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setStep(1)}
                    className="flex-1 justify-center"
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    loading={loading}
                    onClick={handlePlaceOrder}
                    className="flex-1 justify-center"
                  >
                    Place Order
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order summary */}
          <div>
            <div className="card p-6 sticky top-24">
              <h2 className="text-base font-bold text-zinc-900 mb-4">
                Order Summary
              </h2>
              <div className="space-y-2 text-sm text-zinc-500 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-400">
                    {totalPrice > 50 ? "Free" : formatPrice(4.99)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
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
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
                <ShieldCheck className="h-4 w-4" />
                SSL Secured Checkout
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
