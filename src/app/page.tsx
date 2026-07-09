import Link from "next/link";
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Star,
  Sparkles,
  Zap,
  Heart,
  Package,
} from "lucide-react";
import { getProducts } from "@/lib/printful";
import ProductCard from "@/components/ui/ProductCard";

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

const categories = [
  { name: "T-Shirts", icon: "👕", href: "/shop?category=t-shirts", color: "from-violet-600 to-purple-600" },
  { name: "Hoodies", icon: "🧥", href: "/shop?category=hoodies", color: "from-blue-600 to-cyan-600" },
  { name: "Mugs", icon: "☕", href: "/shop?category=mugs", color: "from-amber-600 to-orange-600" },
  { name: "Posters", icon: "🖼️", href: "/shop?category=posters", color: "from-pink-600 to-rose-600" },
  { name: "Hats", icon: "🎩", href: "/shop?category=hats", color: "from-green-600 to-emerald-600" },
  { name: "Accessories", icon: "💎", href: "/shop?category=accessories", color: "from-indigo-600 to-violet-600" },
];

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-brand-950/20 to-zinc-950" />
          <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-brand-600/10 blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-800/60 bg-brand-950/40 px-4 py-1.5 text-sm text-brand-300 mb-8 backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            New designs dropped weekly
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl">
            <span className="gradient-text">Your Vision,</span>
            <br />
            <span className="text-zinc-100">Worn Worldwide</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 sm:text-xl">
            Discover premium print-on-demand products with unique designs. From
            apparel to accessories — crafted for those who dare to stand out.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/shop" className="btn-primary text-base px-8 py-3.5">
              Explore the Shop
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/collections" className="btn-secondary text-base px-8 py-3.5">
              View Collections
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {[
              { value: "50K+", label: "Happy Customers" },
              { value: "200+", label: "Unique Designs" },
              { value: "180+", label: "Countries Shipped" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-zinc-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Shop by Category</h2>
            <p className="mt-4 text-zinc-500">
              Find exactly what you&apos;re looking for
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="group card flex flex-col items-center gap-3 p-6 transition-all hover:border-zinc-700 hover:-translate-y-1"
              >
                <div
                  className={`h-12 w-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow-lg`}
                >
                  {cat.icon}
                </div>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-zinc-950/50">
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
                  className="card aspect-square animate-pulse bg-zinc-800/40"
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
                className="card p-6 flex flex-col gap-4 transition-all hover:border-zinc-700"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-950/60 border border-brand-800/40">
                  <Icon className="h-6 w-6 text-brand-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100 mb-1">{title}</h3>
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
