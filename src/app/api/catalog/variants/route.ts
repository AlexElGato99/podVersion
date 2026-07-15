import { NextRequest, NextResponse } from "next/server";

const PRINTFUL_API = "https://api.printful.com";
const headers = () => ({ Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` });

interface RawVariant {
  id: number;
  name: string;
  size?: string;
  color?: string;
  color_code?: string;
  color_code2?: string;
  image?: string;
  in_stock?: boolean;
  availability_status?: string;
}

// GET /api/catalog/variants?product_id=xxx
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("product_id");
  if (!productId) return NextResponse.json({ error: "product_id required" }, { status: 400 });

  try {
    // Fetch all variants (paginate up to 300)
    let allVariants: RawVariant[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const res = await fetch(
        `${PRINTFUL_API}/v2/catalog-products/${productId}/catalog-variants?limit=${limit}&offset=${offset}`,
        { headers: headers(), next: { revalidate: 3600 } }
      );
      if (!res.ok) throw new Error(`Printful variants error ${res.status}`);
      const data = await res.json();
      const batch: RawVariant[] = data.data ?? [];
      allVariants = allVariants.concat(batch);
      if (batch.length < limit) break;
      offset += limit;
    }

    // Group by color
    const colorMap = new Map<string, {
      color: string;
      color_code: string;
      color_code2?: string;
      image?: string;
      sizes: { id: number; size: string; in_stock: boolean }[];
    }>();

    for (const v of allVariants) {
      const color = v.color ?? "Default";
      const colorCode = v.color_code ?? "#cccccc";

      if (!colorMap.has(color)) {
        colorMap.set(color, {
          color,
          color_code: colorCode,
          color_code2: v.color_code2,
          image: v.image,
          sizes: [],
        });
      }

      colorMap.get(color)!.sizes.push({
        id: v.id,
        size: v.size ?? "One Size",
        in_stock: v.availability_status === "in_stock" || v.in_stock !== false,
      });
    }

    // Sort sizes within each color
    const SIZE_ORDER = ["XS","S","M","L","XL","2XL","3XL","4XL","5XL","One Size"];
    const colors = Array.from(colorMap.values()).map((c) => ({
      ...c,
      sizes: c.sizes.sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)),
    }));

    return NextResponse.json({ colors, total: allVariants.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
