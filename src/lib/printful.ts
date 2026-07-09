const BASE_URL = "https://api.printful.com";

async function printfulFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Printful API error ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

export interface PrintfulProduct {
  id: number;
  name: string;
  thumbnail_url: string;
  variants: number;
  synced: number;
}

export interface PrintfulVariant {
  id: number;
  product_id: number;
  name: string;
  retail_price: string;
  currency: string;
  files: { type: string; preview_url: string }[];
  options: { id: string; value: string }[];
  availability_status: string;
}

export interface PrintfulProductDetail {
  sync_product: PrintfulProduct & { description: string };
  sync_variants: PrintfulVariant[];
}

export async function getProducts(): Promise<PrintfulProduct[]> {
  const data = await printfulFetch("/store/products?limit=50");
  return data.result ?? [];
}

export async function getProduct(id: string): Promise<PrintfulProductDetail> {
  const data = await printfulFetch(`/store/products/${id}`);
  return data.result;
}

export async function getCatalogCategories() {
  const data = await printfulFetch("/categories");
  return data.result?.categories ?? [];
}
