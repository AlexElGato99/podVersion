import { NextResponse } from "next/server";
import { getProduct, type PrintfulProductDetail } from "@/lib/printful";
import { getPrintifyProduct } from "@/lib/printify";
import { createPayPalOrder } from "@/lib/paypal";

interface CartItemInput {
  productId: number;
  variantId: number;
  quantity: number;
  name?: string;
  source?: "printful" | "printify";
  printifyProductId?: string;
  printifyShopId?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: CartItemInput[] = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Recompute authoritative prices from the item's own provider — never trust client-supplied prices.
    const printfulCache = new Map<number, PrintfulProductDetail>();
    const printifyCache = new Map<string, Awaited<ReturnType<typeof getPrintifyProduct>>>();
    const validatedItems: { name: string; quantity: number; unitAmount: number }[] = [];

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
        validatedItems.push({
          name: item.name || product.title,
          quantity: item.quantity,
          unitAmount: variant.price / 100,
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

      validatedItems.push({
        name: item.name || product.sync_product.name,
        quantity: item.quantity,
        unitAmount: parseFloat(variant.retail_price),
      });
    }

    const itemTotal = validatedItems.reduce((s, i) => s + i.unitAmount * i.quantity, 0);
    const shippingAmount = itemTotal > 50 ? 0 : 4.99;
    const taxAmount = Math.round(itemTotal * 0.08 * 100) / 100;

    const order = await createPayPalOrder({
      currency: "USD",
      items: validatedItems,
      shippingAmount,
      taxAmount,
    });

    return NextResponse.json({ id: order.id, itemTotal, shippingAmount, taxAmount });
  } catch (err) {
    console.error("[api/paypal/create-order]", err);
    return NextResponse.json({ error: "Failed to create PayPal order" }, { status: 500 });
  }
}
