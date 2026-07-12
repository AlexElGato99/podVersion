import Link from "next/link";
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Zap,
  Heart,
  Package,
} from "lucide-react";
import { getProducts } from "@/lib/printful";
import ProductCard from "@/components/ui/ProductCard";
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
  icon: string;
  href: string;
  color: string;
}

interface CategorySettings {
  section_title: string;
  section_description: string;
  categories: StoreCategory[];
}

const CATEGORY_DEFAULTS: CategorySettings = {
  section_title: "Shop by Category",
  section_description: "Find exactly what you're looking for",
  categories: [
    { id: "1", name: "T-Shirts",    icon: "👕", href: "/shop?category=t-shirts",    color: "from-violet-600 to-purple-600" },
    { id: "2", name: "Hoodies",     icon: "🧥", href: "/shop?category=hoodies",      color: "from-blue-600 to-cyan-600" },
    { id: "3", name: "Mugs",        icon: "☕", href: "/shop?category=mugs",         color: "from-amber-600 to-orange-600" },
    { id: "4", name: "Posters",     icon: "🖼️", href: "/shop?category=posters",     color: "from-pink-600 to-rose-600" },
    { id: "5", name: "Hats",        icon: "🎩", href: "/shop?category=hats",         color: "from-green-600 to-emerald-600" },
    { id: "6", name: "Accessories", icon: "💎", href: "/shop?category=accessories",  color: "from-indigo-600 to-violet-600" },
  ],
};

async function getCategorySettings(): Promise<CategorySettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("category_settings").select("*").eq("id", 1).single();
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, updated_at: _u, ...rest } = data;
      return { ...CATEGORY_DEFAULTS, ...rest };
    }
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
  bg_from: "#d4f1f9",
  bg_to: "#bde8f7",
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
  "top-left":     { position: "absolute", left: "2%",  top: "6%",    zIndex: 5 },
  "bottom-left":  { position: "absolute", left: "2%",  bottom: "6%", zIndex: 5 },
  "top-right":    { position: "absolute", right: "2%", top: "6%",    zIndex: 5 },
  "bottom-right": { position: "absolute", right: "2%", bottom: "6%", zIndex: 5 },
};

async function getFeaturedProducts() {
  try {
    const products = await getProducts();
    return products.slice(0, 8);
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
  const [products, hero, categoryData] = await Promise.all([getFeaturedProducts(), getHeroSettings(), getCategorySettings()]);

  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section
        className="relative overflow-hidden pt-20"
        style={{
          background: `linear-gradient(135deg, ${hero.bg_from} 0%, ${hero.bg_to} 100%)`,
        }}
      >
        {/* Inject hero bg color as a CSS variable on :root so Navbar can read it */}
        <style dangerouslySetInnerHTML={{ __html: `:root { --hero-bg-from: ${hero.bg_from}; --hero-bg-to: ${hero.bg_to}; }` }} />
        {/* Blue circle blob behind image — animated pulse */}
        <div
          className="hero-blob pointer-events-none absolute right-[8%] top-[10%] h-[520px] w-[520px] rounded-full"
          style={{ background: "radial-gradient(circle, #2d9ee0 0%, #1a7ec8 60%, transparent 100%)", opacity: 0.85 }}
        />

        {/* Animated blue dot decorators */}
        <div className="hero-dot pointer-events-none absolute left-[8%] top-[40%] h-5 w-5 rounded-full bg-blue-500" style={{ animationDelay: "0s" }} />
        <div className="hero-dot pointer-events-none absolute left-[35%] bottom-[22%] h-4 w-4 rounded-full bg-blue-500" style={{ animationDelay: "1s" }} />
        <div className="hero-dot pointer-events-none absolute left-[44%] top-[38%] h-3 w-3 rounded-full bg-blue-400" style={{ animationDelay: "0.5s" }} />

        {/* Animated triangle decorators */}
        <div
          className="hero-tri pointer-events-none absolute"
          style={{ left: "39%", top: "35%", width: 0, height: 0, borderLeft: "18px solid transparent", borderRight: "18px solid transparent", borderBottom: "32px solid #5b4fe9", animationDelay: "0.3s" }}
        />
        <div
          className="hero-tri pointer-events-none absolute"
          style={{ left: "12%", bottom: "18%", width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderBottom: "26px solid #5b4fe9", animationDelay: "1.2s" }}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid min-h-[calc(100vh-80px)] items-stretch gap-0 lg:grid-cols-2">

            {/* Left: Text */}
            <div className="relative z-10 flex flex-col justify-center py-20 text-center lg:text-left">
              <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-6xl lg:text-[64px]">
                {hero.headline}
              </h1>
              <p className="mx-auto mt-6 max-w-sm text-base text-zinc-600 lg:mx-0">
                {hero.subtitle}
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  href={hero.cta_primary_link}
                  className="inline-flex items-center gap-3 rounded-full bg-[#5b4fe9] px-9 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-[#4a3fd8] hover:shadow-xl active:scale-95"
                >
                  {hero.cta_primary_text}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                {hero.cta_secondary_text && (
                  <Link
                    href={hero.cta_secondary_link || "/collections"}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-zinc-700/30 bg-white/60 px-8 py-4 text-base font-semibold text-zinc-800 backdrop-blur-sm transition-all hover:bg-white/90 hover:border-zinc-700/50 active:scale-95"
                  >
                    {hero.cta_secondary_text}
                  </Link>
                )}
              </div>
            </div>

            {/* Right: Product image + animated floating design cards */}
            <div className="relative flex self-stretch items-end justify-center">
              {hero.floating_cards.map((card) => {
                const pos = card.position;
                const { anim, style: animStyle } = CARD_ANIM[pos] ?? CARD_ANIM["top-left"];
                const posStyle = CARD_POS[pos] ?? CARD_POS["top-left"];
                const hasImage = !!card.image_url;
                const isLabel = !card.emoji && !hasImage && card.label;
                return (
                  <div
                    key={card.id}
                    className={`${anim} overflow-hidden rounded-2xl shadow-xl`}
                    style={{
                      ...posStyle,
                      background: card.bg_disabled ? "transparent" : card.bg,
                      boxShadow: card.bg_disabled ? "none" : undefined,
                      color: card.text_color,
                      ...(isLabel ? { width: 130, padding: "12px 16px" } : { width: 110, height: 110 }),
                      ...animStyle,
                    }}
                  >
                    {hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : card.emoji ? (
                      <div className="flex h-full items-center justify-center" style={{ fontSize: 36 }}>
                        {card.emoji}
                      </div>
                    ) : (
                      <div>
                        {card.label && <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{card.label}</p>}
                        {card.sublabel && <p style={{ fontSize: 9, opacity: 0.6, margin: "2px 0 0 0" }}>{card.sublabel}</p>}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Main product image — anchored to bottom, z-index above the cards */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.main_image_url}
                alt="Custom T-Shirts"
                className="relative w-auto object-cover object-bottom"
                style={{ zIndex: 10, height: "90%", maxHeight: 600, alignSelf: "flex-end", filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.2))" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">{categoryData.section_title}</h2>
            <p className="mt-4 text-zinc-500">{categoryData.section_description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categoryData.categories.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className="group card flex flex-col items-center gap-3 p-6 transition-all hover:border-zinc-300 hover:-translate-y-1"
              >
                <div
                  className={`h-12 w-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow-lg`}
                >
                  {cat.icon}
                </div>
                <span className="text-sm font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-zinc-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="section-title">Featured Products</h2>
              <p className="mt-2 text-zinc-500">Hand-picked favorites from our catalog</p>
            </div>
            <Link href="/shop" className="btn-secondary hidden sm:flex">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={0}
                  imageUrl={product.thumbnail_url}
                  badge={product.id % 3 === 0 ? "New" : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="card aspect-square animate-pulse bg-zinc-100/40"
                />
              ))}
            </div>
          )}

          <div className="mt-10 text-center sm:hidden">
            <Link href="/shop" className="btn-secondary">
              View All Products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features / Trust */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Why PrintDrop?</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="card p-6 flex flex-col gap-4 transition-all hover:border-zinc-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 border border-brand-200">
                  <Icon className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-1">{title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 p-12 text-center shadow-2xl shadow-brand-900/50">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent)]" />
            <div className="relative">
              <Heart className="mx-auto mb-4 h-10 w-10 text-white/80" />
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Start Creating Today
              </h2>
              <p className="mt-4 max-w-xl mx-auto text-brand-100">
                Join thousands of creators and find your next favorite piece. New
                designs added every week.
              </p>
              <Link
                href="/shop"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-brand-700 shadow-lg transition-all hover:bg-brand-50 hover:shadow-xl active:scale-95"
              >
                Shop the Collection
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
