import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSetting } from "@/lib/settings";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Printful webhook receiver.
 * Configure this URL in Printful Dashboard → Settings → Webhooks:
 *   https://yourdomain.com/api/webhooks/printful?secret=YOUR_SECRET
 * (set the Webhook Secret field on the Printful API settings tab to enable the check below)
 */
export async function POST(req: Request) {
  const secret = await getSetting("printful", "printful_webhook_secret");
  if (secret) {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: {
    type?: string;
    data?: {
      order?: { id?: number; external_id?: string; status?: string };
      shipment?: { carrier?: string; tracking_number?: string; tracking_url?: string };
    };
  };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = payload.data?.order?.id;
  if (!orderId) {
    // Nothing we can match to a stored order — acknowledge so Printful stops retrying.
    return NextResponse.json({ received: true });
  }

  const printfulOrderId = String(orderId);

  // Look up the order once so notifications can reference the customer/amount.
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, email, total_amount")
    .eq("printful_order_id", printfulOrderId)
    .maybeSingle();

  switch (payload.type) {
    case "package_shipped": {
      const shipment = payload.data?.shipment;
      await supabaseAdmin
        .from("orders")
        .update({
          status: "shipped",
          carrier: shipment?.carrier ?? null,
          tracking_number: shipment?.tracking_number ?? null,
          tracking_url: shipment?.tracking_url ?? null,
        })
        .eq("printful_order_id", printfulOrderId);
      await supabaseAdmin.from("notifications").insert({
        type: "order_shipped",
        title: `Order shipped${order?.email ? ` — ${order.email}` : ""}`,
        message: shipment?.tracking_number
          ? `Tracking: ${shipment.tracking_number}${shipment.carrier ? ` (${shipment.carrier})` : ""}`
          : "Package has shipped.",
        metadata: { order_id: order?.id ?? null, printful_order_id: printfulOrderId },
      });
      break;
    }
    case "order_updated": {
      const status = payload.data?.order?.status;
      if (status === "fulfilled") {
        await supabaseAdmin
          .from("orders")
          .update({ status: "fulfilled" })
          .eq("printful_order_id", printfulOrderId);
        await supabaseAdmin.from("notifications").insert({
          type: "order_fulfilled",
          title: `Order fulfilled${order?.email ? ` — ${order.email}` : ""}`,
          message: "Printful has fulfilled this order.",
          metadata: { order_id: order?.id ?? null, printful_order_id: printfulOrderId },
        });
      }
      break;
    }
    case "order_failed":
    case "order_canceled": {
      await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("printful_order_id", printfulOrderId);
      await supabaseAdmin.from("notifications").insert({
        type: "order_cancelled",
        title: `Order cancelled${order?.email ? ` — ${order.email}` : ""}`,
        message: payload.type === "order_failed" ? "Printful reported a fulfillment failure." : "Order was cancelled.",
        metadata: { order_id: order?.id ?? null, printful_order_id: printfulOrderId },
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
