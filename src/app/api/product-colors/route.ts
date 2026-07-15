import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://api.printful.com";

// Lightweight endpoint: returns color name + hex + shirt image + mockup image per unique color for a product.
// Does NOT go through getProduct enrichment chain — reads raw Printful API directly.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const res = await fetch(`${BASE_URL}/store/products/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID ?? "",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Printful ${res.status}`);
    const data = await res.json();
    const variants: {
      name: string;
      files?: { type: string; preview_url?: string }[];
      product?: { variant_id: number; image: string };
    }[] = data.result?.sync_variants ?? [];

    // Extract color from variant name: "Product / Color / Size" or "Product / Color"
    const seen = new Map<string, { colorName: string; variantId: number; shirtUrl: string; mockupUrl: string | null }>();

    for (const v of variants) {
      const parts = v.name.split(" / ").map((p: string) => p.trim());
      let colorName: string | null = null;
      if (parts.length >= 3) {
        colorName = parts[parts.length - 2];
      } else if (parts.length === 2) {
        const SIZE_RE = /^(XS|S|M|L|XL|\d*XL|One Size|OS)$/i;
        if (!SIZE_RE.test(parts[1])) colorName = parts[1];
      }

      if (!colorName || seen.has(colorName)) continue;
      if (!v.product?.variant_id) continue;

      const mockupUrl = v.files?.find((f) => f.type === "preview" && f.preview_url)?.preview_url ?? null;
      const shirtUrl = v.product.image ?? "";

      seen.set(colorName, {
        colorName,
        variantId: v.product.variant_id,
        shirtUrl,
        mockupUrl,
      });
    }

    // Fetch hex codes from catalog in parallel
    const entries = Array.from(seen.values());
    const hexResults = await Promise.allSettled(
      entries.map(async (e) => {
        const r = await fetch(`${BASE_URL}/catalog/variants/${e.variantId}`, {
          headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
          next: { revalidate: 3600 },
        });
        if (!r.ok) return { colorName: e.colorName, hex: null, hex2: null };
        const d = await r.json();
        const codes: string[] = d.result?.variant?.color?.color_codes ?? [];
        return { colorName: e.colorName, hex: codes[0] ?? null, hex2: codes[1] ?? null };
      })
    );

    const colors = entries.map((e, i) => {
      const hexResult = hexResults[i];
      const hex = hexResult.status === "fulfilled" ? hexResult.value.hex : null;
      const hex2 = hexResult.status === "fulfilled" ? hexResult.value.hex2 : null;
      return {
        name: e.colorName,
        hex: hex ?? "#888888",
        hex2: hex2 ?? null,
        shirtUrl: e.shirtUrl,
        mockupUrl: e.mockupUrl,
      };
    }).filter((c) => c.shirtUrl); // only include colors that have a shirt image

    return NextResponse.json({ colors });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
