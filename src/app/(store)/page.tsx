import Link from "next/link";

// Always render with fresh DB settings so homepage section layout (max_products)
// reflects dashboard changes immediately.
export const dynamic = "force-dynamic";
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Zap,
  Shirt,
  Wind,
  Coffee,
  Sticker,
  HardHat,
  Image as ImageIcon,
  ShoppingBag,
} from "lucide-react";
import { getStoreProducts } from "@/lib/products";
import { getCatalogCategories } from "@/lib/printful";
import ProductCard from "@/components/ui/ProductCard";
import { productSlug } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface HeroSettings {
  headline: string;
  subtitle: string;
  cta_primary_text: string;
  cta_primary_link: string;
  cta_secondary_text: string;
  cta_secondary_link: string;
}

interface StoreCategory {
  id: string;
  name: string;
  image_url: string;
  href: string;
  /** Optional admin override — an Iconify icon slug (e.g. "lucide:shirt").
   *  Leave unset to auto-match an icon from the category name. */
  icon?: string;
}

interface CategorySettings {
  section_title: string;
  section_description: string;
  categories: StoreCategory[];
}

const CATEGORY_DEFAULTS: CategorySettings = {
  section_title: "Shop by Category",
  section_description: "Find exactly what you're looking for",
  categories: [],
};

async function getCategorySettings(): Promise<CategorySettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("category_settings").select("*").eq("id", 1).single();
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, updated_at: _u, ...rest } = data;
      const merged: CategorySettings = { ...CATEGORY_DEFAULTS, ...rest };
      if (merged.categories?.length > 0) return merged;
    }
  } catch { /* fall through */ }
  // Fall back to Printful top-level categories
  try {
    const all = await getCatalogCategories() as { id: number; parent_id: number; title: string; image_url: string }[];
    const top = all.filter((c) => c.parent_id === 0 && c.id !== 159 && c.id !== 277).slice(0, 7);
    return {
      ...CATEGORY_DEFAULTS,
      categories: top.map((c) => ({
        id: String(c.id),
        name: c.title,
        image_url: c.image_url,
        href: `/shop?category=${encodeURIComponent(c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`,
      })),
    };
  } catch { /* fall through */ }
  return CATEGORY_DEFAULTS;
}

// ── "Shop by Category" icons — served via the Iconify API instead of photos ──
// Each icon is a literal depiction of the category (an actual t-shirt, cap,
// mug, sofa, etc.) rather than an abstract symbol, picked from whichever
// Iconify set (Phosphor, Tabler, Lucide) has the clearest match — verified
// against api.iconify.design directly. Keyword table checked
// most-specific-first, same pattern as inferCategory() above.
const CATEGORY_STYLE_MAP: { test: RegExp; icon: string }[] = [
  { test: /women|woman|ladies|dress/i, icon: "ph:dress" },
  { test: /\bmen\b|\bman\b|guys/i, icon: "ph:t-shirt" },
  { test: /kid|youth|child|baby|toddler/i, icon: "lucide:baby" },
  { test: /mug|cup|tumbler|drinkware/i, icon: "tabler:mug" },
  { test: /sticker|decal/i, icon: "lucide:sticker" },
  { test: /canvas|poster|wall art|wall decor|art print/i, icon: "lucide:image" },
  { test: /cap|hat|beanie|snapback|trucker/i, icon: "ph:baseball-cap" },
  { test: /hoodie|sweatshirt|pullover|fleece/i, icon: "ph:hoodie" },
  { test: /shoe|footwear|sneaker/i, icon: "lucide:footprints" },
  { test: /jewel|necklace/i, icon: "mdi:necklace" },
  { test: /watch/i, icon: "lucide:watch" },
  { test: /glass|eyewear|sunglasses/i, icon: "ph:sunglasses" },
  { test: /phone|case/i, icon: "lucide:smartphone" },
  { test: /bag|tote|backpack/i, icon: "lucide:shopping-bag" },
  { test: /accessor/i, icon: "ph:sunglasses" },
  { test: /home|living|decor|kitchen|furniture/i, icon: "lucide:sofa" },
  { test: /t-shirt|tee|shirt|apparel|clothing|jersey|polo/i, icon: "lucide:shirt" },
];
const DEFAULT_CATEGORY_STYLE = { icon: "lucide:shopping-bag" };

function getCategoryStyle(name: string, iconOverride?: string) {
  const matched = CATEGORY_STYLE_MAP.find((c) => c.test.test(name)) ?? DEFAULT_CATEGORY_STYLE;
  // Only the icon varies per category — every tile shares one warm Etsy-style
  // palette (brand-50 circle, brand-600 icon), applied in the render below.
  return iconOverride ? { ...matched, icon: iconOverride } : matched;
}

// Generic tag icon shown if the Iconify API is unreachable — keeps the
// homepage rendering instead of failing the whole category section.
const FALLBACK_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L3 9.83a2 2 0 0 0 0 2.83l9.58 9.58a2 2 0 0 0 2.83 0l6.58-6.59a2 2 0 0 0 .6-1.41Z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>';

// Fetched icon SVGs are cached per server process — icons are a small, fixed
// set, so there's no reason to re-fetch the same icon on every request
// (same pattern as printful.ts's catalogTypeCache / printify.ts's blueprintCache).
const iconSvgCache = new Map<string, string>();

async function getIconSvg(icon: string): Promise<string> {
  const cached = iconSvgCache.get(icon);
  if (cached) return cached;
  try {
    const res = await fetch(`https://api.iconify.design/${icon}.svg`);
    if (!res.ok) throw new Error(`Iconify API error ${res.status}`);
    const svg = await res.text();
    iconSvgCache.set(icon, svg);
    return svg;
  } catch {
    iconSvgCache.set(icon, FALLBACK_ICON_SVG);
    return FALLBACK_ICON_SVG;
  }
}

const HERO_DEFAULTS: HeroSettings = {
  headline: "Premium Quality Shirts, Made to Last",
  subtitle: "Soft, durable fabric and expert craftsmanship in every shirt we ship — no gimmicks, just great quality you can feel.",
  cta_primary_text: "Shop Shirts",
  cta_primary_link: "/shop",
  cta_secondary_text: "View Collections",
  cta_secondary_link: "/collections",
};

async function getHeroSettings(): Promise<HeroSettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("hero_settings").select("*").eq("id", 1).single();
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, updated_at: _u, ...rest } = data;
      // Merge with defaults so any missing DB columns are filled
      return { ...HERO_DEFAULTS, ...rest };
    }
  } catch { /* fall through to defaults */ }
  return HERO_DEFAULTS;
}

async function getAllProducts() {
  try {
    return await getStoreProducts();
  } catch {
    return [];
  }
}

/* ── Categorize products by name keywords ──────────────────────── */
type CategoryKey = "tshirts" | "hoodies" | "mugs" | "stickers" | "caps" | "wallart" | "other";

interface ProductCategory {
  key: CategoryKey;
  label: string;
  subtitle: string;
  shopSlug: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  accent: string;
  // admin-overridable
  isVisible?: boolean;
  maxProducts?: number;
  sortOrder?: number;
  sectionBg?: "white" | "zinc";
  badgeFirst?: string;
  badgeSecond?: string;
}

interface HomepageSectionRow {
  key: string;
  label?: string;
  subtitle?: string;
  shop_slug?: string;
  is_visible?: boolean;
  max_products?: number;
  sort_order?: number;
  bg?: string;
  badge_first?: string;
  badge_second?: string;
}

const PRODUCT_CATEGORIES: ProductCategory[] = [
  { key: "tshirts",  label: "Custom T-Shirts & Graphic Tees",     subtitle: "Premium unisex tees with vibrant DTG prints",           shopSlug: "t-shirt",   icon: Shirt,       bg: "bg-orange-50",  accent: "text-orange-600", sortOrder: 0 },
  { key: "hoodies",  label: "Hoodies & Sweatshirts",               subtitle: "Cozy custom hoodies — perfect for every season",        shopSlug: "hoodie",    icon: Wind,        bg: "bg-blue-50",    accent: "text-blue-600",   sortOrder: 1 },
  { key: "mugs",     label: "Custom Mugs & Drinkware",             subtitle: "Start your morning with your favourite design",          shopSlug: "mug",       icon: Coffee,      bg: "bg-amber-50",   accent: "text-amber-600",  sortOrder: 2 },
  { key: "stickers", label: "Stickers & Decals",                   subtitle: "Waterproof, fade-resistant custom stickers",            shopSlug: "sticker",   icon: Sticker,     bg: "bg-green-50",   accent: "text-green-600",  sortOrder: 3 },
  { key: "caps",     label: "Caps & Hats",                         subtitle: "Structured & unstructured caps for every style",        shopSlug: "cap",       icon: HardHat,     bg: "bg-purple-50",  accent: "text-purple-600", sortOrder: 4 },
  { key: "wallart",  label: "Canvas Prints & Wall Art",            subtitle: "Stretched canvas, posters, framed art and statement decor", shopSlug: "canvas", icon: ImageIcon,  bg: "bg-rose-50",    accent: "text-rose-600",   sortOrder: 5 },
  { key: "other",    label: "Accessories & More",                  subtitle: "Phone cases, tote bags and everyday extras",           shopSlug: "",          icon: ShoppingBag, bg: "bg-zinc-50",    accent: "text-zinc-600",   sortOrder: 6 },
];

async function getHomepageSections(): Promise<ProductCategory[]> {
  try {
    const { data } = await supabaseAdmin
      .from("homepage_sections")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data && data.length > 0) {
      return PRODUCT_CATEGORIES.map((def) => {
        const saved = data.find((s: HomepageSectionRow) => s.key === def.key);
        if (!saved) return def;
        return {
          ...def,
          label:       saved.label        ?? def.label,
          subtitle:    saved.subtitle     ?? def.subtitle,
          shopSlug:    saved.shop_slug    ?? def.shopSlug,
          isVisible:   saved.is_visible   !== undefined ? saved.is_visible : true,
          maxProducts: Number(saved.max_products ?? 6),
          sortOrder:   saved.sort_order   ?? def.sortOrder,
          sectionBg:   (saved.bg as "white" | "zinc") ?? undefined,
          badgeFirst:  saved.badge_first  ?? undefined,
          badgeSecond: saved.badge_second ?? undefined,
        };
      }).sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
    }
  } catch { /* fall through */ }
  return PRODUCT_CATEGORIES;
}

function classifyProduct(name: string, catalogTypeName?: string | null): CategoryKey {
  // Prefer the real Printful catalog product type (e.g. "Snapback Trucker
  // Cap", "Ceramic Mug") — it's authoritative and doesn't depend on however
  // the merchant happened to title the synced store product. Only fall back
  // to guessing from the custom title if the catalog lookup wasn't available.
  const primary = catalogTypeName?.trim() || name;
  const n = primary.toLowerCase();

  // Check the most specific/least ambiguous keywords first so a cap or mug
  // whose title also happens to contain an unrelated word never gets
  // swallowed by the broader t-shirt fallback below.
  if (/mug|cup|tumbler|bottle|drinkware/.test(n)) return "mugs";
  if (/sticker|decal/.test(n)) return "stickers";
  if (/canvas|poster|wall art|wall decor|framed|frame|stretched matte|art print/.test(n)) return "wallart";
  if (/cap|hat|beanie|snapback|trucker|dad hat/.test(n)) return "caps";
  if (/hoodie|sweatshirt|pullover|fleece|crewneck/.test(n)) return "hoodies";
  if (/t-shirt|tee|jersey|tank|polo|shirt/.test(n)) return "tshirts";

  // Fall back to the store title too, in case the catalog type name was
  // generic (e.g. "Custom Product") but the merchant's own title is clear.
  if (primary !== name) {
    const alt = name.toLowerCase();
    if (/mug|cup|tumbler|bottle|drinkware/.test(alt)) return "mugs";
    if (/sticker|decal/.test(alt)) return "stickers";
    if (/canvas|poster|wall art|wall decor|framed|frame|stretched matte|art print/.test(alt)) return "wallart";
    if (/cap|hat|beanie|snapback|trucker|dad hat/.test(alt)) return "caps";
    if (/hoodie|sweatshirt|pullover|fleece|crewneck/.test(alt)) return "hoodies";
    if (/t-shirt|tee|jersey|tank|polo|shirt/.test(alt)) return "tshirts";
  }

  return "other";
}

async function getPrintfulCategories() {
  try {
    const all = await getCatalogCategories();
    // Top-level only (parent_id === 0), skip "Brands" and "All products"
    return (all as { id: number; parent_id: number; title: string; image_url: string }[])
      .filter((c) => c.parent_id === 0 && c.id !== 159 && c.id !== 277)
      .slice(0, 8);
  } catch {
    return [];
  }
}

const features = [
  {
    icon: Truck,
    title: "Fast Worldwide Shipping",
    description: "We ship to 180+ countries with tracking on every order.",
  },
  {
    icon: ShieldCheck,
    title: "Premium Quality",
    description: "All products are made with top-grade materials and rigorous QC.",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    description: "30-day hassle-free return policy on all orders.",
  },
  {
    icon: Zap,
    title: "Fast Fulfillment",
    description: "Most orders are fulfilled within 2–5 business days.",
  },
];

export default async function HomePage() {
  const [products, hero, categoryData, sectionSettings] = await Promise.all([
    getAllProducts(), getHeroSettings(), getCategorySettings(), getHomepageSections()
  ]);

  // Resolve each "Shop by Category" tile's icon (name + color) up front so
  // the SVG markup is ready before render — keeps this fully server-rendered
  // with no client-side fetch/flash.
  const categoryIcons = await Promise.all(
    categoryData.categories.map(async (cat) => {
      const style = getCategoryStyle(cat.name, cat.icon);
      return { ...style, svg: await getIconSvg(style.icon) };
    })
  );

  // Classify every product (not just a handful) so a section never comes up
  // empty just because its matching products weren't among the first few
  // fetched — each product is bucketed using the authoritative Printful
  // catalog type first, falling back to its store title only if that's
  // unavailable.
  const allProducts = products.map((p) => ({
    ...p,
    category: classifyProduct(p.name, p.catalog_type_name),
  }));

  // Group by category, capped per-section by each section's configured max (default 6)
  const byCategory: Record<CategoryKey, typeof allProducts> = {
    tshirts: [], hoodies: [], mugs: [], stickers: [], caps: [], wallart: [], other: [],
  };
  for (const p of allProducts) {
    const cat = p.category as CategoryKey;
    byCategory[cat].push(p);
  }

  // Keep the first 8 (most recently added) for the JSON-LD ItemList (all products combined)
  const featuredProducts = allProducts.slice(0, 8);

  return (
    <div className="overflow-x-hidden bg-white">
      {/* ── Hero — simple, text-only, no images/animations ── */}
      <section className="bg-white pt-20 sm:pt-32 lg:flex lg:min-h-screen lg:items-center">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8 lg:py-0">
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl lg:text-[52px]">
            {hero.headline}
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            {hero.subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={hero.cta_primary_link}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              {hero.cta_primary_text}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {hero.cta_secondary_text && (
              <Link
                href={hero.cta_secondary_link || "/collections"}
                className="inline-flex items-center gap-2 rounded-full border-2 border-zinc-900 bg-transparent px-7 py-3.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-900 hover:text-white"
              >
                {hero.cta_secondary_text}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Categories — managed via admin dashboard */}
      <section className="py-12 bg-white border-b border-zinc-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-7">
            <h2 className="text-xl font-bold text-zinc-900">{categoryData.section_title}</h2>
            <Link href="/shop" className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline transition-colors">
              Browse all
            </Link>
          </div>
          {categoryData.categories.length > 0 && (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              {categoryData.categories.map((cat, i) => {
                const { svg } = categoryIcons[i];
                return (
                  <Link key={cat.id} href={cat.href} className="group flex flex-col items-center gap-2.5">
                    <div
                      className="flex h-16 w-16 sm:h-24 sm:w-24 items-center justify-center rounded-full border border-zinc-200 bg-brand-50 group-hover:border-brand-300 group-hover:shadow-md transition-all duration-200"
                    >
                      <span
                        className="inline-block h-9 w-9 sm:h-14 sm:w-14 text-brand-600 transition-transform duration-300 group-hover:scale-110 [&>svg]:h-full [&>svg]:w-full"
                        aria-hidden
                        dangerouslySetInnerHTML={{ __html: svg }}
                      />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-zinc-700 group-hover:text-brand-600 text-center leading-tight transition-colors">
                      {cat.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Category Product Sections ── */}
      {/* ItemList JSON-LD for all products */}
      {featuredProducts.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              "name": "Best-Selling Custom Print-on-Demand Products",
              "description": "Top custom graphic tees, hoodies, mugs, stickers and accessories printed on demand by Veliova.",
              "url": "https://veliova.com",
              "itemListElement": featuredProducts.map((p, i) => ({
                "@type": "ListItem",
                "position": i + 1,
                "url": `https://veliova.com/shop/${productSlug(p.name, p.id)}`,
                "name": p.name,
              })),
            }),
          }}
        />
      )}

      {sectionSettings.map((cat, sectionIdx) => {
        if (cat.isVisible === false) return null;
        const sectionCols = Math.max(1, Math.min(12, Number(cat.maxProducts ?? 6) || 6));
        const catProducts = byCategory[cat.key as CategoryKey].slice(0, sectionCols);
        if (catProducts.length === 0) return null;
        const Icon = cat.icon;
        const bgClass = cat.sectionBg === "zinc" ? "bg-zinc-50/60" : cat.sectionBg === "white" ? "bg-white" : sectionIdx % 2 === 0 ? "bg-white" : "bg-zinc-50/60";
        return (
          <section key={cat.key} className={`py-14 ${bgClass}`}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${cat.bg}`}>
                    <Icon className={`h-5 w-5 ${cat.accent}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">{cat.label}</h2>
                    <p className="mt-0.5 text-sm text-zinc-500">{cat.subtitle}</p>
                  </div>
                </div>
                <Link
                  href={cat.shopSlug ? `/shop?category=${cat.shopSlug}` : "/shop"}
                  className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
                >
                  See all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Column count is responsive: a single full-width card on phones,
                  2 on large phones, 3 on tablets, and the admin-configured
                  `max_products` value only from `lg` up. Setting
                  gridTemplateColumns inline for every breakpoint (as this did
                  before) forced that desktop number onto phones too — 6 columns
                  on a 375px screen renders ~55px-wide product cards. */}
              <div
                className="grid gap-x-4 gap-y-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:[grid-template-columns:repeat(var(--section-cols),minmax(0,1fr))]"
                style={{ "--section-cols": sectionCols } as React.CSSProperties}
              >
                {catProducts.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.starting_price ? parseFloat(product.starting_price) : 0}
                    imageUrl={product.best_image || product.thumbnail_url}
                    freeShipping={Number(product.id) % 3 === 0}
                    badge={
                      i === 0 && cat.badgeFirst ? cat.badgeFirst :
                      i === 1 && cat.badgeSecond ? cat.badgeSecond : undefined
                    }
                  />
                ))}
              </div>

              <div className="mt-6 text-center sm:hidden">
                <Link
                  href={cat.shopSlug ? `/shop?category=${cat.shopSlug}` : "/shop"}
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  See all {cat.label} →
                </Link>
              </div>
            </div>
          </section>
        );
      })}

      {/* Features / Trust */}
      <section className="py-12 bg-zinc-50 border-t border-zinc-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col items-center text-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-brand-100 px-8 py-14 text-center shadow-sm shadow-brand-200/50">
            <div className="relative">
              <span className="inline-flex items-center rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                New arrivals and best sellers
              </span>
              <h2 className="mt-4 text-3xl font-bold text-brand-950 sm:text-4xl">Find something you&apos;ll love</h2>
              <p className="mt-3 max-w-md mx-auto text-sm leading-relaxed text-brand-800/80">
                Thousands of unique designs, made just for you. New products added every week.
              </p>
              <Link
                href="/shop"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-300 transition-all hover:-translate-y-0.5 hover:bg-brand-700"
              >
                Start shopping
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
