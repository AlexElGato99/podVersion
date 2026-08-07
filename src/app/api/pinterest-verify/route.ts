import { getSettingsSection } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves Pinterest's domain-verification HTML file from the site root.
 *
 * Pinterest issues a uniquely named file (for example
 * "pinterest-1a2b3c.html") and checks for it at the domain root. A rewrite in
 * next.config.ts maps any /pinterest-*.html request here, so the admin can
 * paste a new filename in the dashboard without needing a redeploy.
 */
export async function GET(req: Request) {
  const requested =
    new URL(req.url).searchParams.get("filename")?.trim() ||
    req.headers.get("x-pinterest-verify-file")?.trim();
  if (!requested) return new Response("Not found", { status: 404 });

  const settings = await getSettingsSection("pinterest").catch(() => ({} as Record<string, string>));
  const expected = settings.pinterest_verify_filename?.trim();
  if (!expected) return new Response("Not found", { status: 404 });

  // Only serve the exact filename that was configured. Responding 200 to every
  // pinterest-*.html guess would let anyone claim the domain on Pinterest.
  if (requested.toLowerCase() !== expected.toLowerCase()) {
    return new Response("Not found", { status: 404 });
  }

  // Pinterest only requires the file to exist at the expected path; the body it
  // supplies is usually a short confirmation string. Fall back to the filename
  // if no body was saved.
  const body = settings.pinterest_verify_content?.trim() || expected;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
