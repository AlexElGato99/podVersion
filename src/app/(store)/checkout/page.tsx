"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  ShieldCheck,
  Truck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError?: (err: unknown) => void;
      }) => { render: (container: HTMLElement) => void };
    };
  }
}

const steps = ["Shipping", "Review", "Payment"];

// Full USPS 2-letter state/territory codes — required so Printful's address
// validation (which rejects free-text state names/typos) always receives a
// valid code. This was the confirmed cause of a real order being rejected:
// "Recipient: Invalid state code".
const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "PR", name: "Puerto Rico" }, { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];


export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const buttonsContainerRef = useRef<HTMLDivElement>(null);
  const buttonsRenderedRef = useRef(false);

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

  useEffect(() => {
    fetch("/api/paypal/client-id")
      .then((r) => r.json())
      .then((d) => setPaypalClientId(d.clientId))
      .catch(() => setPayError("Unable to load payment provider."));
  }, []);

  useEffect(() => {
    if (step !== 2 || !sdkReady || !window.paypal || !buttonsContainerRef.current) return;
    if (buttonsRenderedRef.current) return;
    buttonsRenderedRef.current = true;

    window.paypal.Buttons({
      createOrder: async () => {
        setPayError(null);
        const res = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
              name: i.name,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to start payment");
        return data.id;
      },
      onApprove: async (data) => {
        const res = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paypalOrderId: data.orderID,
            items: items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
              name: i.name,
              imageUrl: i.imageUrl,
              size: i.size,
              color: i.color,
            })),
            shipping,
          }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          setPayError(result.error ?? "Payment could not be completed. Please try again.");
          return;
        }
        setCompleted(true);
        clearCart();
      },
      onError: (err) => {
        console.error("[paypal buttons]", err);
        setPayError("Something went wrong with PayPal. Please try again.");
      },
    }).render(buttonsContainerRef.current);
  }, [step, sdkReady, items, shipping, clearCart]);

  function handleShippingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep(1);
  }


  if (completed) {
    return (
      <div className="pt-24 pb-16 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto h-20 w-20 rounded-full bg-accent-500/10 border border-accent-500/30 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-accent-600" />
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
                      ? "text-accent-600 cursor-pointer"
                      : "text-zinc-400"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors ${
                      i === step
                        ? "border-brand-600 bg-brand-50 text-brand-600"
                        : i < step
                        ? "border-accent-600 bg-accent-500/10 text-accent-600"
                        : "border-zinc-200 bg-white text-zinc-400"
                    }`}
                  >
                    {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  {s}
                </button>
                {i < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-zinc-300 mx-3" />
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
                  {shipping.country === "US" ? (
                    <div>
                      <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                        State
                      </label>
                      <select
                        className="input"
                        value={shipping.state}
                        onChange={(e) =>
                          setShipping({ ...shipping, state: e.target.value })
                        }
                        required
                      >
                        <option value="">Select a state…</option>
                        {US_STATES.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <Input
                      label="State / Province"
                      placeholder="Region"
                      value={shipping.state}
                      onChange={(e) =>
                        setShipping({ ...shipping, state: e.target.value })
                      }
                      required
                    />
                  )}
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
                        setShipping({ ...shipping, country: e.target.value, state: "" })
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

            {/* Step 1: Review */}
            {step === 1 && (
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
                          alt={item.color ? `${item.name} in ${item.color}` : item.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {item.color && <span>{item.color}</span>}
                          {item.color && item.size && <span> · </span>}
                          {item.size && <span>{item.size}</span>}
                          {(item.color || item.size) && <span> · </span>}
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
                    Continue to Payment
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <ShieldCheck className="h-5 w-5 text-brand-600" />
                  <h2 className="text-lg font-bold text-zinc-900">
                    Payment
                  </h2>
                </div>

                {payError && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{payError}</span>
                  </div>
                )}

                {paypalClientId && (
                  <Script
                    src={`https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`}
                    strategy="afterInteractive"
                    onLoad={() => setSdkReady(true)}
                  />
                )}

                <div
                  ref={buttonsContainerRef}
                  id="paypal-button-container"
                  className="relative z-0 isolate [transform:translateZ(0)]"
                />

                {!sdkReady && (
                  <p className="text-sm text-zinc-500">Loading payment options…</p>
                )}

                <div className="mt-6">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setStep(1)}
                    className="w-full justify-center"
                  >
                    Back
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
                  <span className="text-accent-600 font-medium">
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
