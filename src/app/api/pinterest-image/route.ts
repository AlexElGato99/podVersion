import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * Serves product mockups at the 2:3 portrait ratio Pinterest expects.
 *
 * Printify returns square 1200x1200 mockups, but Pinterest requires catalog
 * images of at least 1000x1500. This pads the source onto a white 1000x1500
 * canvas rather than cropping, so no part of the design is cut off.
 *
 * Usage: /api/pinterest-image?src=<url-encoded source image>
 */

// Only these hosts may be fetched. Without an allowlist this route would be an
// open image proxy: anyone could pass an arbitrary URL and use the site to
// fetch internal or third-party resources.
const ALLOWED_HOST_SUFFIXES = [
  "images-api.printify.com",
  "images.printify.com",
  "cdn.printify.com",
  "files.cdn.printful.com",
  "cdn.printful.com",
  "printful.com",
  "supabase.co",
];

const TARGET_WIDTH = 1000;
const TARGET_HEIGHT = 1500;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

function isAllowed(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`)
  );
}

export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get("src");
  if (!src) {
    return NextResponse.json({ error: "Missing src parameter" }, { status: 400 });
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(src);
  } catch {
    return NextResponse.json({ error: "Invalid src URL" }, { status: 400 });
  }

  if (!isAllowed(sourceUrl)) {
    return NextResponse.json({ error: "Source host not allowed" }, { status: 403 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(sourceUrl.toString(), { signal: controller.signal });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Source responded ${upstream.status}` },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength > MAX_SOURCE_BYTES) {
      return NextResponse.json({ error: "Source image too large" }, { status: 413 });
    }

    const output = await sharp(buffer)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        // `contain` scales the whole mockup to fit and pads the remainder,
        // so nothing is cropped out of frame.
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .jpeg({ quality: 88, progressive: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        // Mockup URLs are content-addressed by Printify, so a given src never
        // changes. Cache hard - Pinterest re-fetches these on every ingest.
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(output.byteLength),
      },
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.error("[pinterest-image] Failed to render", {
      src: sourceUrl.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: aborted ? "Source image timed out" : "Failed to process image" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
