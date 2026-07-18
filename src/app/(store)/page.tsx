import Link from "next/link";
import Image from "next/image";
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
  ShoppingBag,
} from "lucide-react";
import { getStoreProducts } from "@/lib/products";
import { getCatalogCategories } from "@/lib/printful";
import ProductCard from "@/components/ui/ProductCard";
import { productSlug } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

interface FloatingCard {
  id: string;
  emoji: string;
  image_url: string;
  label: string;
  sublabel: string;
  bg: string;
  bg_disabled?: boolean;
  text_color: string;
  position: "top-left" | "bottom-left" | "top-right" | "bottom-right";
}

interface HeroSettings {
  headline: string;
  subtitle: string;
  cta_primary_text: string;
  cta_primary_link: string;
  cta_secondary_text: string;
  cta_secondary_link: string;
  bg_from: string;
  bg_to: string;
  main_image_url: string;
  floating_cards: FloatingCard[];
}

interface StoreCategory {
  id: string;
  name: string;
  image_url: string;
  href: string;
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

const HERO_DEFAULTS: HeroSettings = {
  headline: "The leader in quality custom T-Shirts",
  subtitle: "Turn your ideas into premium products that leave a lasting impression",
  cta_primary_text: "Shop Now",
  cta_primary_link: "/shop",
  cta_secondary_text: "View Collections",
  cta_secondary_link: "/collections",
  bg_from: "#fdf1e7",
  bg_to: "#fce8d5",
  main_image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&auto=format&fit=crop&q=80",
  floating_cards: [
    { id: "1", emoji: "🐼", image_url: "", label: "", sublabel: "", bg: "#0d3d5f", text_color: "#ffffff", position: "top-left" },
    { id: "2", emoji: "👨‍🚀", image_url: "", label: "", sublabel: "", bg: "#d4eaff", text_color: "#374151", position: "bottom-left" },
    { id: "3", emoji: "", image_url: "", label: "Company Name", sublabel: "Slogan Here", bg: "#ffffff", text_color: "#374151", position: "top-right" },
    { id: "4", emoji: "🚛", image_url: "", label: "", sublabel: "", bg: "#ffffff", text_color: "#374151", position: "bottom-right" },
  ],
};

async function getHeroSettings(): Promise<HeroSettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("hero_settings").select("*").eq("id", 1).single();
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, updated_at: _u, ...rest } = data;
      // Merge with defaults so any missing DB columns are filled
      const merged: HeroSettings = { ...HERO_DEFAULTS, ...rest };
      // Normalize legacy positions
      const TARGET: FloatingCard["position"][] = ["top-left", "bottom-left", "top-right", "bottom-right"];
      const cards: FloatingCard[] = merged.floating_cards || HERO_DEFAULTS.floating_cards;
      const taken = new Set(cards.map((c) => c.position));
      const missing = TARGET.filter((p) => !taken.has(p));
      let missingIdx = 0;
      merged.floating_cards = cards.map((c) => {
        const valid = TARGET.includes(c.position as FloatingCard["position"]);
        if (!valid || (taken.has(c.position) && cards.filter((x) => x.position === c.position).length > 1)) {
          const newPos = missing[missingIdx++] ?? TARGET[0];
          return { ...c, position: newPos };
        }
        return c;
      });
      return merged;
    }
  } catch { /* fall through to defaults */ }
  return HERO_DEFAULTS;
}

/* Animation delay map per card position */
const CARD_ANIM: Record<FloatingCard["position"], { anim: string; style: React.CSSProperties }> = {
  "top-left":     { anim: "hero-float",         style: { animationDelay: "0s",    animationDuration: "4s"   } },
  "bottom-left":  { anim: "hero-float-reverse",  style: { animationDelay: "1.0s",  animationDuration: "4.8s" } },
  "top-right":    { anim: "hero-float-reverse",  style: { animationDelay: "0.8s",  animationDuration: "5s"   } },
  "bottom-right": { anim: "hero-float",          style: { animationDelay: "0.4s",  animationDuration: "4.5s" } },
};

/* Position styles for each floating card slot — cards sit BEHIND the main image (zIndex: 5) */
const CARD_POS: Record<FloatingCard["position"], React.CSSProperties> = {
  "top-left":     { position: "absolute", left: "2%",  top: "20%",   zIndex: 5 },
  "bottom-left":  { position: "absolute", left: "2%",  bottom: "6%", zIndex: 5 },
  "top-right":    { position: "absolute", right: "2%", top: "20%",   zIndex: 5 },
  "bottom-right": { position: "absolute", right: "2%", bottom: "6%", zIndex: 5 },
};

async function getAllProducts() {
  try {
    return await getStoreProducts();
  } catch {
    return [];
  }
}

/* ── Categorize products by name keywords ──────────────────────── */
type CategoryKey = "tshirts" | "hoodies" | "mugs" | "stickers" | "caps" | "other";

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
  { key: "other",    label: "Accessories & More",                  subtitle: "Posters, phone cases, tote bags & beyond",             shopSlug: "",          icon: ShoppingBag, bg: "bg-zinc-50",    accent: "text-zinc-600",   sortOrder: 5 },
];

async function getHomepageSections(): Promise<ProductCategory[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
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
          maxProducts: saved.max_products ?? 6,
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
  if (/cap|hat|beanie|snapback|trucker|dad hat/.test(n)) return "caps";
  if (/hoodie|sweatshirt|pullover|fleece|crewneck/.test(n)) return "hoodies";
  if (/t-shirt|tee|jersey|tank|polo|shirt/.test(n)) return "tshirts";

  // Fall back to the store title too, in case the catalog type name was
  // generic (e.g. "Custom Product") but the merchant's own title is clear.
  if (primary !== name) {
    const alt = name.toLowerCase();
    if (/mug|cup|tumbler|bottle|drinkware/.test(alt)) return "mugs";
    if (/sticker|decal/.test(alt)) return "stickers";
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
    tshirts: [], hoodies: [], mugs: [], stickers: [], caps: [], other: [],
  };
  for (const p of allProducts) {
    const cat = p.category as CategoryKey;
    byCategory[cat].push(p);
  }

  // Keep the first 8 (most recently added) for the JSON-LD ItemList (all products combined)
  const featuredProducts = allProducts.slice(0, 8);

  return (
    <div className="overflow-x-hidden bg-white">
      {/* ── Hero — Etsy style ── */}
      <section
        className="relative min-h-screen pt-[100px] flex flex-col bg-white"
      >
        <div className="flex-1 flex flex-col mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
          <div className="flex-1 grid gap-8 py-12 lg:grid-cols-2 lg:gap-16 lg:py-0 w-full">

            {/* Left: copy */}
            <div className="flex flex-col gap-6 justify-center">
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl lg:text-[52px]">
                {hero.headline}
              </h1>

              <p className="max-w-md text-base leading-relaxed text-zinc-600">
                {hero.subtitle}
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href={hero.cta_primary_link}
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-zinc-700 active:scale-95"
                >
                  {hero.cta_primary_text}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {hero.cta_secondary_text && (
                  <Link
                    href={hero.cta_secondary_link || "/collections"}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-zinc-900 bg-transparent px-7 py-3.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-zinc-900 hover:text-white active:scale-95"
                  >
                    {hero.cta_secondary_text}
                  </Link>
                )}
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-amber-200/60">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Truck className="h-3.5 w-3.5 text-zinc-400" />
                  Free shipping on orders $50+
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
                  Secure checkout
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                  30-day returns
                </div>
              </div>

              {/* Social-proof */}
              <div className="inline-flex w-fit items-center gap-2 text-xs font-semibold text-amber-800">
                <span className="flex text-amber-400">★★★★★</span>
                Loved by thousands of creators
              </div>
            </div>

            {/* Right: product image — anchored to bottom */}
            <div className="relative flex flex-col items-center justify-end">
              {/* Floating product cards (admin-controlled) */}
              {hero.floating_cards.map((card) => {
                const pos = card.position;
                const { anim, style: animStyle } = CARD_ANIM[pos] ?? CARD_ANIM["top-left"];
                const posStyle = CARD_POS[pos] ?? CARD_POS["top-left"];
                const hasImage = !!card.image_url;
                const isLabel = !card.emoji && !hasImage && card.label;
                return (
                  <div
                    key={card.id}
                    className={`${anim} overflow-hidden rounded-2xl shadow-lg`}
                    style={{
                      ...posStyle,
                      background: card.bg_disabled ? "transparent" : card.bg,
                      boxShadow: card.bg_disabled ? "none" : "0 8px 24px rgba(0,0,0,0.10)",
                      color: card.text_color,
                      ...(isLabel ? { width: 148, padding: "12px 16px" } : { width: 116, height: 116 }),
                      ...animStyle,
                    }}
                  >
                    {hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : card.emoji ? (
                      <div className="flex h-full items-center justify-center" style={{ fontSize: 30 }}>
                        {card.emoji}
                      </div>
                    ) : (
                      <div className="p-1">
                        {card.label && <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{card.label}</p>}
                        {card.sublabel && <p style={{ fontSize: 9, opacity: 0.6, margin: "2px 0 0 0" }}>{card.sublabel}</p>}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Main image — anchored to bottom, no background */}
              <div className="relative z-10" style={{ maxWidth: 560 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.main_image_url}
                  alt="Featured product"
                  className="w-full object-contain object-bottom"
                  style={{ maxHeight: "calc(100vh - 100px)", display: "block" }}
                />
              </div>
            </div>
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
              {categoryData.categories.map((cat) => (
                <Link key={cat.id} href={cat.href} className="group flex flex-col items-center gap-2.5">
                  <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-zinc-100 border border-zinc-200 group-hover:border-brand-300 group-hover:shadow-md transition-all duration-200">
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 14vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  </div>
                  <span className="text-xs font-medium text-zinc-700 group-hover:text-brand-600 text-center leading-tight transition-colors">
                    {cat.name}
                  </span>
                </Link>
              ))}
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
              "description": "Top custom graphic tees, hoodies, mugs, stickers and accessories printed on demand by PrintDrop.",
              "url": "https://printdrop.com",
              "itemListElement": featuredProducts.map((p, i) => ({
                "@type": "ListItem",
                "position": i + 1,
                "url": `https://printdrop.com/shop/${productSlug(p.name, p.id)}`,
                "name": p.name,
              })),
            }),
          }}
        />
      )}

      {sectionSettings.map((cat, sectionIdx) => {
        if (cat.isVisible === false) return null;
        const catProducts = byCategory[cat.key as CategoryKey].slice(0, cat.maxProducts ?? 6);
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

              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
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
          <div className="relative overflow-hidden rounded-3xl bg-zinc-900 px-8 py-14 text-center">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #ea580c 0%, transparent 60%), radial-gradient(circle at 80% 50%, #0d9488 0%, transparent 60%)" }} />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Find something you&apos;ll love</h2>
              <p className="mt-3 text-zinc-400 max-w-md mx-auto text-sm">
                Thousands of unique designs, made just for you. New products added every week.
              </p>
              <Link
                href="/shop"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
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
