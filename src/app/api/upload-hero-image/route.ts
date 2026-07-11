import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/bmp", "image/tiff"];

export async function POST(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  // ── Parse form data ─────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 413 });
  }

  // ── Convert to WebP ─────────────────────────────────────
  const inputBuffer = Buffer.from(bytes);
  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(inputBuffer)
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
  } catch (e) {
    return NextResponse.json({ error: `Image conversion failed: ${(e as Error).message}` }, { status: 500 });
  }

  // ── Determine storage path ──────────────────────────────
  const slot = (formData.get("slot") as string) || "misc";
  const timestamp = Date.now();
  const storagePath = `${slot}/${timestamp}.webp`;

  // ── Upload to Supabase Storage ──────────────────────────
  const { error: uploadErr } = await supabaseAdmin.storage
    .from("hero-images")
    .upload(storagePath, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("hero-images")
    .getPublicUrl(storagePath);

  return NextResponse.json({
    url: publicUrl,
    path: storagePath,
    size_kb: Math.round(webpBuffer.byteLength / 1024),
    original_size_kb: Math.round(bytes.byteLength / 1024),
  });
}
