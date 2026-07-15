import { NextResponse } from "next/server";

const PRINTFUL_API = "https://api.printful.com";
const AUTH = () => ({ Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` });

interface PFProduct {
  id: number;
  name: string;
  type: string;
  type_name: string;
  image: string;
  variant_count: number;
  main_category_id: number;
  techniques?: { key: string; display_name: string; is_default: boolean }[];
  files?: { type: string }[];
  options?: { id: string }[];
}

// Fetch ALL catalog products by paginating Printful v2 API
async function fetchAllCatalogProducts(): Promise<PFProduct[]> {
  const all: PFProduct[] = [];
  const limit = 100;
  let offset  = 0;

  while (true) {
    const res = await fetch(
      `${PRINTFUL_API}/v2/catalog-products?limit=${limit}&offset=${offset}`,
      { headers: AUTH(), next: { revalidate: 3600 } }
    );
    if (!res.ok) break;
    const data = await res.json();
    const batch: PFProduct[] = data.data ?? [];
    all.push(...batch);
    // Stop if we got fewer than a full page
    if (batch.length < limit) break;
    offset += limit;
  }

  return all;
}

// Printful type codes that involve printing (DTG, sublimation, embroidery, etc.)
// Exclude types that are plain accessories with no print area
const PRINT_TYPE_KEYWORDS = [
  "shirt", "tee", "tshirt", "t-shirt",
  "hoodie", "sweatshirt", "sweater", "crewneck",
  "jacket", "zip",
  "hat", "cap", "beanie", "snapback", "trucker",
  "mug", "cup", "tumbler", "bottle", "drinkware",
  "poster", "print", "canvas", "framed", "art",
  "tote", "bag", "backpack",
  "phone", "case", "iphone",
  "sticker", "label",
  "pillow", "cushion",
  "blanket", "towel",
  "apron", "bib",
  "leggings", "shorts", "jogger", "pant",
  "sock", "underwear",
  "face mask", "gaiter",
  "notebook", "journal",
  "onesie", "bodysuit", "kid", "youth", "toddler",
  "long sleeve", "tank", "polo",
];

function isPrintProduct(p: PFProduct): boolean {
  const name = (p.name + " " + (p.type_name ?? "") + " " + (p.type ?? "")).toLowerCase();
  return PRINT_TYPE_KEYWORDS.some((kw) => name.includes(kw));
}

// GET /api/catalog?search=&category=
export async function GET(req: Request) {
  const url    = new URL(req.url);
  const search = url.searchParams.get("search")?.toLowerCase() ?? "";
  const cat    = url.searchParams.get("category") ?? ""; // keyword-based

  try {
    const all = await fetchAllCatalogProducts();

    // Filter to printable products only
    let filtered = all.filter(isPrintProduct);

    // Apply category keyword filter
    if (cat) {
      const kw = cat.toLowerCase();
      filtered = filtered.filter((p) =>
        (p.name + " " + (p.type_name ?? "")).toLowerCase().includes(kw)
      );
    }

    // Apply text search
    if (search) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(search) ||
        (p.type_name ?? "").toLowerCase().includes(search)
      );
    }

    // Sort alphabetically
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ products: filtered, total: filtered.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
