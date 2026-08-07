import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getProduct, createPrintfulOrder, type PrintfulProductDetail } from "@/lib/printful";
import { getPrintifyProduct, createPrintifyOrder } from "@/lib/printify";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/paypal";
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
  source?: "printful" | "printify";
  printifyProductId?: string;
  printifyShopId?: string;
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

interface ValidatedItem {
  name: string;
  quantity: number;
  unitAmount: number;
  variantId: number;
  imageUrl?: string;
  size?: string;
  color?: string;
  source: "printful" | "printify";
  printifyProductId?: string;
  printifyShopId?: string;
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

    // 1. Refuse to process the same PayPal order twice. A retried request, a
    // double-click, or a refreshed tab would otherwise place a second
    // production order against a single payment.
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id, provider, status")
      .eq("paypal_order_id", paypalOrderId);

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        orders: existing.map((o) => ({
          orderId: o.id,
          provider: o.provider,
          providerOrderId: null,
          status: o.status,
          fulfillmentError: null,
        })),
      });
    }

    // 2. Re-validate prices from each item's own provider — never trust client-supplied prices.
    const printfulCache = new Map<number, PrintfulProductDetail>();
    const printifyCache = new Map<string, Awaited<ReturnType<typeof getPrintifyProduct>>>();
    const orderItems: ValidatedItem[] = [];

    for (const item of items) {
      if (!item.variantId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json({ error: "Invalid cart item" }, { status: 400 });
      }

      if (item.source === "printify") {
        if (!item.printifyProductId || !item.printifyShopId) {
          return NextResponse.json({ error: "Missing Printify product reference" }, { status: 400 });
        }
        const cacheKey = `${item.printifyShopId}:${item.printifyProductId}`;
        let product = printifyCache.get(cacheKey);
        if (!product) {
          product = await getPrintifyProduct(item.printifyShopId, item.printifyProductId);
          printifyCache.set(cacheKey, product);
        }
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          return NextResponse.json({ error: `Variant ${item.variantId} not found` }, { status: 400 });
        }
        orderItems.push({
          name: item.name || product.title,
          quantity: item.quantity,
          unitAmount: variant.price / 100,
          variantId: item.variantId,
          imageUrl: item.imageUrl,
          size: item.size,
          color: item.color,
          source: "printify",
          printifyProductId: item.printifyProductId,
          printifyShopId: item.printifyShopId,
        });
        continue;
      }

      if (!item.productId) {
        return NextResponse.json({ error: "Invalid cart item" }, { status: 400 });
      }
      let product = printfulCache.get(item.productId);
      if (!product) {
        product = await getProduct(String(item.productId));
        printfulCache.set(item.productId, product);
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
        source: "printful",
      });
    }

    const subtotal = orderItems.reduce((s, i) => s + i.unitAmount * i.quantity, 0);
    const shippingAmount = subtotal > 50 ? 0 : 4.99;
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + shippingAmount + taxAmount) * 100) / 100;

    // 3. Confirm the approved PayPal order is actually for these goods before
    // taking any money.
    //
    // The item list arrives in the request body, and the PayPal order amount is
    // fixed server-side when the order is created. Without this check the two
    // are never reconciled, so a caller could approve a cheap order and then
    // post an expensive item list to this endpoint: the prices would all
    // validate against the provider, a real production order would be placed,
    // and only the small amount would ever have been charged.
    const paypalOrder = await getPayPalOrder(paypalOrderId);

    if (paypalOrder.status === "COMPLETED") {
      return NextResponse.json({ error: "This payment has already been captured" }, { status: 409 });
    }

    // Allow a cent of drift for floating-point rounding, nothing more.
    if (Math.abs(paypalOrder.amount - total) > 0.01) {
      console.error("[api/paypal/capture-order] Amount mismatch — refusing to capture", {
        paypalOrderId,
        approvedAmount: paypalOrder.amount,
        expectedTotal: total,
      });
      return NextResponse.json(
        { error: "Order total does not match the approved payment. Please restart checkout." },
        { status: 400 }
      );
    }

    if (paypalOrder.currency !== "USD") {
      return NextResponse.json({ error: "Unsupported payment currency" }, { status: 400 });
    }

    // 4. Capture the PayPal payment
    const capture = await capturePayPalOrder(paypalOrderId);
    if (capture.status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    // 5. Group items by fulfillment provider — a cart spanning both providers
    // (or multiple Printify shops) becomes one order row per group, since
    // each ships independently with its own tracking, same as a multi-shop
    // Etsy cart splits into separate orders.
    const groups = new Map<string, { provider: "printful" | "printify"; printifyShopId?: string; items: ValidatedItem[] }>();
    for (const item of orderItems) {
      const key = item.source === "printify" ? `printify:${item.printifyShopId}` : "printful";
      if (!groups.has(key)) {
        groups.set(key, { provider: item.source, printifyShopId: item.printifyShopId, items: [] });
      }
      groups.get(key)!.items.push(item);
    }

    let userId: string | null = null;
    try {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // guest checkout
    }

    const results: {
      orderId: string | null;
      provider: "printful" | "printify";
      providerOrderId: string | null;
      status: string;
      fulfillmentError: string | null;
    }[] = [];

    // 6. Place a production order per group, then persist + notify per row.
    for (const group of groups.values()) {
      const groupSubtotal = group.items.reduce((s, i) => s + i.unitAmount * i.quantity, 0);
      const share = subtotal > 0 ? groupSubtotal / subtotal : 0;
      const groupShipping = Math.round(shippingAmount * share * 100) / 100;
      const groupTax = Math.round(taxAmount * share * 100) / 100;
      const groupTotal = groupSubtotal + groupShipping + groupTax;

      let providerOrderId: string | null = null;
      let providerStatus = "pending";
      let fulfillmentError: string | null = null;

      try {
        if (group.provider === "printful") {
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
            items: group.items.map((i) => ({
              sync_variant_id: i.variantId,
              quantity: i.quantity,
              retail_price: i.unitAmount.toFixed(2),
            })),
            externalId: capture.captureId,
          });
          providerOrderId = String(printfulOrder.id);
          providerStatus = printfulOrder.status;
        } else {
          const printifyOrder = await createPrintifyOrder({
            shopId: group.printifyShopId!,
            lineItems: group.items.map((i) => ({
              product_id: i.printifyProductId!,
              variant_id: i.variantId,
              quantity: i.quantity,
            })),
            addressTo: {
              first_name: shipping.firstName,
              last_name: shipping.lastName,
              email: shipping.email,
              phone: shipping.phone,
              country: shipping.country,
              region: shipping.state,
              address1: shipping.address,
              city: shipping.city,
              zip: shipping.zip,
            },
            externalId: `${capture.captureId}-${group.printifyShopId}`,
          });
          providerOrderId = printifyOrder.id;
          providerStatus = printifyOrder.status;
        }
      } catch (err) {
        // Payment already captured — log loudly so it can be fulfilled manually, but don't fail the customer's order.
        fulfillmentError = err instanceof Error ? err.message : String(err);
        console.error(`[api/paypal/capture-order] ${group.provider} order creation failed:`, fulfillmentError);
      }

      const { data: dbOrder, error: dbError } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: userId,
          email: shipping.email,
          provider: group.provider,
          printful_order_id: group.provider === "printful" && providerOrderId ? providerOrderId : null,
          printify_order_id: group.provider === "printify" && providerOrderId ? providerOrderId : null,
          paypal_order_id: paypalOrderId,
          payment_status: "paid",
          status: providerOrderId ? "processing" : "pending",
          total_amount: groupTotal,
          subtotal_amount: groupSubtotal,
          shipping_amount: groupShipping,
          tax_amount: groupTax,
          currency: "USD",
          shipping_address: shipping,
          items: group.items,
          fulfillment_error: fulfillmentError,
        })
        .select("id")
        .single();

      if (dbError) {
        console.error("[api/paypal/capture-order] Failed to save order", dbError);
      }

      results.push({
        orderId: dbOrder?.id ?? null,
        provider: group.provider,
        providerOrderId,
        status: providerStatus,
        fulfillmentError,
      });

      // Notify the admin dashboard (bell icon) — best-effort, never fails the order.
      try {
        const customerName = `${shipping.firstName} ${shipping.lastName}`;
        const itemCount = group.items.reduce((s, i) => s + i.quantity, 0);
        await supabaseAdmin.from("notifications").insert({
          type: "new_order",
          title: `New order from ${customerName}`,
          message: `${itemCount} item${itemCount === 1 ? "" : "s"} — $${groupTotal.toFixed(2)} (${group.provider})`,
          metadata: {
            order_id: dbOrder?.id ?? null,
            provider: group.provider,
            provider_order_id: providerOrderId,
            total_amount: groupTotal,
            customer_name: customerName,
            email: shipping.email,
          },
        });
        if (fulfillmentError) {
          await supabaseAdmin.from("notifications").insert({
            type: "fulfillment_error",
            title: `Fulfillment failed for ${customerName}'s order`,
            message: fulfillmentError,
            metadata: { order_id: dbOrder?.id ?? null, provider: group.provider, email: shipping.email },
          });
        }
      } catch (notifyErr) {
        console.error("[api/paypal/capture-order] Failed to create notification", notifyErr);
      }
    }

    return NextResponse.json({
      success: true,
      orders: results,
    });
  } catch (err) {
    console.error("[api/paypal/capture-order]", err);
    return NextResponse.json({ error: "Failed to complete order" }, { status: 500 });
  }
}
