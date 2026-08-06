import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { buildMerchantRows } from "@/lib/merchant-sync";
import { batchUpsertMerchantProducts, MerchantConfigError } from "@/lib/google-merchant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The catalogue expands to a few thousand variants, so a full push is split
// into chunks by the caller. This ceiling covers one chunk comfortably.
export const maxDuration = 300;

const DEFAULT_CHUNK = 500;
const MAX_CHUNK = 1000;

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin" ? user : null;
}

/**
 * Pushes the catalogue to Google Merchant Center in chunks.
 *
 * The client calls this repeatedly, passing back `nextOffset` until `done` is
 * true. Chunking keeps every request well inside the serverless time limit and
 * lets the dashboard show progress instead of hanging on one long request.
 *
 * Pass `dryRun: true` to count what would be sent without contacting Google.
 */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { offset?: number; chunkSize?: number; dryRun?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — defaults apply.
  }

  const offset = Math.max(0, Number(body.offset) || 0);
  const chunkSize = Math.min(MAX_CHUNK, Math.max(1, Number(body.chunkSize) || DEFAULT_CHUNK));
  const dryRun = body.dryRun === true;

  try {
    const { rows, productCount, skipped } = await buildMerchantRows();
    const total = rows.length;
    const slice = rows.slice(offset, offset + chunkSize);
    const nextOffset = offset + slice.length;
    const done = nextOffset >= total;

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        total,
        productCount,
        skipped: skipped.slice(0, 20),
        skippedCount: skipped.length,
        sample: slice.slice(0, 3),
      });
    }

    if (slice.length === 0) {
      return NextResponse.json({
        total, productCount, processed: 0, nextOffset: total,
        done: true, succeeded: 0, failed: 0, errors: [],
      });
    }

    const result = await batchUpsertMerchantProducts(slice);

    return NextResponse.json({
      total,
      productCount,
      processed: slice.length,
      nextOffset,
      done,
      succeeded: result.succeeded,
      failed: result.failed,
      // Cap the payload — a failing chunk could otherwise return hundreds of
      // near-identical messages.
      errors: result.errors.slice(0, 10),
      skippedCount: skipped.length,
    });
  } catch (err) {
    if (err instanceof MerchantConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }

    const googleErr = err as {
      code?: number | string;
      message?: string;
      errors?: Array<{ reason?: string; message?: string }>;
    };

    console.error("[merchant-sync] Sync failed", {
      offset,
      chunkSize,
      code: googleErr.code,
      message: googleErr.message,
      errors: googleErr.errors,
    });

    return NextResponse.json(
      {
        error: googleErr.message ?? "Sync failed",
        details: googleErr.errors ?? null,
      },
      { status: 502 }
    );
  }
}
