import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSetting } from "@/lib/settings";
import {
  upsertMerchantProduct,
  deleteMerchantProduct,
  MerchantConfigError,
  type SupabaseProductRow,
} from "@/lib/google-merchant";

/**
 * Supabase Database Webhook → Google Merchant Center sync.
 *
 * Wire this up in: Supabase Dashboard → Database → Webhooks → Create:
 *   Table:    public.products
 *   Events:   Insert, Update, Delete
 *   Type:     HTTP Request → POST
 *   URL:      https://veliova.com/api/webhooks/supabase-products
 *   Headers:  x-webhook-secret: <same value as SUPABASE_WEBHOOK_SECRET>
 *
 * googleapis signs a JWT with node:crypto, so this must run on the Node.js
 * runtime — the Edge runtime lacks the required primitives.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Payload shape Supabase sends for database webhooks. */
interface SupabaseWebhookPayload {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  schema?: string;
  record?: SupabaseProductRow | null;
  old_record?: SupabaseProductRow | null;
}

/**
 * Constant-time secret comparison. A plain `!==` leaks how many leading
 * characters matched via response timing, which lets an attacker recover the
 * token byte by byte.
 */
function isValidSecret(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws when lengths differ, so length-check first. The
  // length itself is not sensitive.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const startedAt = Date.now();

  // ── 1. Authenticate the request ──
  const expectedSecret = await getSetting("google_merchant", "supabase_webhook_secret");
  if (!expectedSecret) {
    // Fail closed: without a configured secret this endpoint would accept
    // writes from anyone on the internet.
    console.error(
      "[supabase-products] No webhook secret configured — refusing to process webhook. " +
        "Set one in Dashboard -> Settings -> Google Merchant."
    );
    return NextResponse.json(
      { error: "Webhook secret not configured on the server" },
      { status: 500 }
    );
  }

  const provided =
    req.headers.get("x-webhook-secret") ?? req.headers.get("x-supabase-signature");

  if (!isValidSecret(provided, expectedSecret)) {
    console.warn("[supabase-products] Rejected webhook with missing/invalid secret header.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse the payload ──
  let payload: SupabaseWebhookPayload;
  try {
    payload = await req.json();
  } catch (err) {
    console.error("[supabase-products] Body was not valid JSON:", err);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { type, table, record, old_record: oldRecord } = payload;

  if (!type) {
    return NextResponse.json({ error: "Missing event type" }, { status: 400 });
  }

  // Guard against the webhook being pointed at the wrong table by mistake.
  if (table && table !== "products") {
    console.warn(`[supabase-products] Ignoring event from unexpected table "${table}".`);
    return NextResponse.json({ received: true, skipped: `unexpected table: ${table}` });
  }

  // ── 3. Sync to Google Merchant Center ──
  try {
    if (type === "DELETE") {
      const target = oldRecord ?? record;
      if (!target?.id) {
        return NextResponse.json({ error: "DELETE event had no row id" }, { status: 400 });
      }

      const result = await deleteMerchantProduct(target);
      console.info(
        `[supabase-products] Deleted ${result.offerId} from Merchant Center (${Date.now() - startedAt}ms)`
      );
      return NextResponse.json({ success: true, ...result });
    }

    if (type === "INSERT" || type === "UPDATE") {
      if (!record?.id) {
        return NextResponse.json({ error: `${type} event had no record` }, { status: 400 });
      }

      const result = await upsertMerchantProduct(record);
      console.info(
        `[supabase-products] ${type} → upserted ${result.offerId} ` +
          `(product id: ${result.productId}, ${Date.now() - startedAt}ms)`
      );
      return NextResponse.json({ success: true, event: type, ...result });
    }

    return NextResponse.json({ received: true, skipped: `unhandled event type: ${type}` });
  } catch (err) {
    // Surface as much detail as the Google client gives us — its errors carry
    // a nested `errors[]` array that explains *which attribute* was rejected,
    // which the top-level message alone does not.
    if (err instanceof MerchantConfigError) {
      console.error("[supabase-products]", err.message);
      return NextResponse.json({ error: err.message }, { status: 503 });
    }

    const googleErr = err as {
      code?: number | string;
      message?: string;
      errors?: Array<{ reason?: string; message?: string; domain?: string }>;
      response?: { data?: unknown };
    };

    console.error("[supabase-products] Merchant Center sync failed", {
      rowId: record?.id ?? oldRecord?.id ?? null,
      event: type,
      code: googleErr.code,
      message: googleErr.message,
      errors: googleErr.errors,
      response: googleErr.response?.data,
    });

    // 4xx from Google means the payload is wrong — retrying won't help, so
    // return 200 to stop Supabase from redelivering it indefinitely. 5xx and
    // network faults are transient, so return 502 to allow a retry.
    const status = Number(googleErr.code);
    const isClientError = Number.isFinite(status) && status >= 400 && status < 500;

    return NextResponse.json(
      {
        success: false,
        error: googleErr.message ?? "Merchant Center sync failed",
        details: googleErr.errors ?? null,
        retryable: !isClientError,
      },
      { status: isClientError ? 200 : 502 }
    );
  }
}
