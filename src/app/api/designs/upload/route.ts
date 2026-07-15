import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/designs/upload
 * Body: FormData with field "file" (image)
 * Returns: { url, storage_path, width, height }
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPG, WebP, SVG allowed" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "png";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const storagePath = `uploads/${filename}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await db.storage
    .from("designs")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = db.storage.from("designs").getPublicUrl(storagePath);

  return NextResponse.json({
    url: urlData.publicUrl,
    storage_path: storagePath,
    original_filename: file.name,
    size: file.size,
    mime_type: file.type,
  });
}
