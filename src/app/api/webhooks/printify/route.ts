import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";
import { getSetting } from "@/lib/settings";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Pulls a value out of whichever nesting level Printify's webhook payload happens to use. */
function pick(obj: unknown, keys: string[]): string | null {
  if (!obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;
  for (const key of keys) {
    const v = rec[key];
    if (typeof v === "string" && v) return v;
  }
  return null;
}

/**
 * Printify webhook receiver — register these via the "Register webhooks"
 * button in Dashboard → Settings → Printify API (see /api/admin/printify-webhooks).
 * Unlike Printful, Printify has no manual dashboard webhook UI, so the
 * signing secret is captured automatically at registration time and stored
 * as the printify_webhook_secret setting.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  let payload: {
    type?: string;
    topic?: string;
    resource?: { id?: string; type?: string; data?: Record<string, unknown> };
    data?: Record<string, unknown> & { order_id?: string; id?: string };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const secret = await getSetting("printify", "printify_webhook_secret");
  if (secret) {
    const signature = req.headers.get("x-pfy-signature") ?? req.headers.get("X-Pfy-Signature");
    if (!verifySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const topic = payload.type ?? payload.topic ?? "";
  const resource = payload.resource;
  const shipmentData = resource?.data ?? payload.data ?? {};

  // Printify's order id shows up as resource.id (order-scoped events) or
  // data.order_id (shipment events nested under an order) depending on topic.
  const printifyOrderId = resource?.id ?? shipmentData.order_id ?? (typeof payload.data?.id === "string" ? payload.data.id : undefined);

  if (!printifyOrderId) {
    // Nothing we can match to a stored order — acknowledge so Printify stops retrying.
    console.warn("[webhooks/printify] No order id found in payload:", JSON.stringify(payload).slice(0, 500));
    return NextResponse.json({ received: true });
  }

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, email, total_amount")
    .eq("printify_order_id", printifyOrderId)
    .maybeSingle();

  if (topic === "order:shipment:created") {
    const trackingNumber = pick(shipmentData, ["number", "tracking_number"]);
    const trackingUrl = pick(shipmentData, ["url", "tracking_url"]);
    const carrier = pick(shipmentData, ["carrier", "carrier_code"]);

    await supabaseAdmin
      .from("orders")
      .update({
        status: "shipped",
        carrier,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
      })
      .eq("printify_order_id", printifyOrderId);

    await supabaseAdmin.from("notifications").insert({
      type: "order_shipped",
      title: `Order shipped${order?.email ? ` — ${order.email}` : ""}`,
      message: trackingNumber ? `Tracking: ${trackingNumber}${carrier ? ` (${carrier})` : ""}` : "Package has shipped.",
      metadata: { order_id: order?.id ?? null, printify_order_id: printifyOrderId },
    });
  } else if (topic === "order:shipment:delivered") {
    await supabaseAdmin
      .from("orders")
      .update({ status: "fulfilled" })
      .eq("printify_order_id", printifyOrderId);

    await supabaseAdmin.from("notifications").insert({
      type: "order_fulfilled",
      title: `Order delivered${order?.email ? ` — ${order.email}` : ""}`,
      message: "Printify reports this order has been delivered.",
      metadata: { order_id: order?.id ?? null, printify_order_id: printifyOrderId },
    });
  } else if (topic === "order:sent-to-production") {
    await supabaseAdmin
      .from("orders")
      .update({ status: "processing" })
      .eq("printify_order_id", printifyOrderId);
  }

  return NextResponse.json({ received: true });
}
