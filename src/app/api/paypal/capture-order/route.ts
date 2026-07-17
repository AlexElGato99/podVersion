import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getProduct, createPrintfulOrder, type PrintfulProductDetail } from "@/lib/printful";
import { capturePayPalOrder } from "@/lib/paypal";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CartItemInput {
  productId: number;
  variantId: number;
  quantity: number;
  name: string;
  imageUrl?: string;
  size?: string;
  color?: string;
}

interface ShippingInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paypalOrderId: string | undefined = body?.paypalOrderId;
    const items: CartItemInput[] = Array.isArray(body?.items) ? body.items : [];
    const shipping: ShippingInput | undefined = body?.shipping;

    if (!paypalOrderId || items.length === 0 || !shipping) {
      return NextResponse.json({ error: "Missing order data" }, { status: 400 });
    }
    if (!shipping.firstName || !shipping.lastName || !shipping.address || !shipping.city || !shipping.zip || !shipping.country) {
      return NextResponse.json({ error: "Incomplete shipping address" }, { status: 400 });
    }

    // 1. Capture the PayPal payment
    const capture = await capturePayPalOrder(paypalOrderId);
    if (capture.status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    // 2. Re-validate prices from Printful (authoritative source, never trust client)
    const productCache = new Map<number, PrintfulProductDetail>();
    const orderItems: { name: string; quantity: number; unitAmount: number; variantId: number; imageUrl?: string; size?: string; color?: string }[] = [];

    for (const item of items) {
      if (!item.productId || !item.variantId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json({ error: "Invalid cart item" }, { status: 400 });
      }
      let product = productCache.get(item.productId);
      if (!product) {
        product = await getProduct(String(item.productId));
        productCache.set(item.productId, product);
      }
      const variant = product.sync_variants.find((v) => v.id === item.variantId);
      if (!variant) {
        return NextResponse.json({ error: `Variant ${item.variantId} not found` }, { status: 400 });
      }
      orderItems.push({
        name: item.name || product.sync_product.name,
        quantity: item.quantity,
        unitAmount: parseFloat(variant.retail_price),
        variantId: item.variantId,
        imageUrl: item.imageUrl,
        size: item.size,
        color: item.color,
      });
    }

    const subtotal = orderItems.reduce((s, i) => s + i.unitAmount * i.quantity, 0);
    const shippingAmount = subtotal > 50 ? 0 : 4.99;
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
    const total = subtotal + shippingAmount + taxAmount;

    // 3. Place the production order with Printful
    let printfulOrderId: number | null = null;
    let printfulStatus = "pending";
    let printfulError: string | null = null;
    try {
      const printfulOrder = await createPrintfulOrder({
        recipient: {
          name: `${shipping.firstName} ${shipping.lastName}`,
          address1: shipping.address,
          city: shipping.city,
          state_code: shipping.state,
          country_code: shipping.country,
          zip: shipping.zip,
          email: shipping.email,
          phone: shipping.phone,
        },
        items: orderItems.map((i) => ({
          sync_variant_id: i.variantId,
          quantity: i.quantity,
          retail_price: i.unitAmount.toFixed(2),
        })),
        externalId: capture.captureId,
      });
      printfulOrderId = printfulOrder.id;
      printfulStatus = printfulOrder.status;
    } catch (err) {
      // Payment already captured — log loudly so it can be fulfilled manually, but don't fail the customer's order.
      printfulError = err instanceof Error ? err.message : String(err);
      console.error("[api/paypal/capture-order] Printful order creation failed:", printfulError);
    }

    // 4. Persist the order in Supabase
    let userId: string | null = null;
    try {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // guest checkout
    }

    const { data: dbOrder, error: dbError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        email: shipping.email,
        printful_order_id: printfulOrderId ? String(printfulOrderId) : null,
        paypal_order_id: paypalOrderId,
        payment_status: "paid",
        status: printfulOrderId ? "processing" : "pending",
        total_amount: total,
        subtotal_amount: subtotal,
        shipping_amount: shippingAmount,
        tax_amount: taxAmount,
        currency: "USD",
        shipping_address: shipping,
        items: orderItems,
        fulfillment_error: printfulError,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("[api/paypal/capture-order] Failed to save order", dbError);
    }

    return NextResponse.json({
      success: true,
      orderId: dbOrder?.id ?? null,
      printfulOrderId,
      printfulStatus,
      printfulError,
    });
  } catch (err) {
    console.error("[api/paypal/capture-order]", err);
    return NextResponse.json({ error: "Failed to complete order" }, { status: 500 });
  }
}
