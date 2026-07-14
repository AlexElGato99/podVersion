import Link from "next/link";
import {
  Sparkles,
  Heart,
  Globe,
  Zap,
  Users,
  Package,
  Star,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "About PrintDrop — Artist-Designed Custom Apparel & Gifts, Shipped Across the USA",
  description: "PrintDrop is an independent artist-run print-on-demand store based in the USA. We create unique graphic tees, hoodies, mugs and gifts — every product is printed on demand and fulfilled by Printful.",
  keywords: ["about printdrop", "independent artist store", "custom apparel USA", "graphic tee artist", "print on demand brand", "artist designed clothing"],
  alternates: { canonical: "https://printdrop.com/about" },
  openGraph: {
    title: "About PrintDrop — Artist-Designed Custom Apparel & Gifts",
    description: "We’re an independent artist-run POD store. Unique graphic tees, hoodies & gifts — printed on demand, shipped across the USA by Printful.",
    url: "https://printdrop.com/about",
    type: "website",
  },
};

const values = [
  {
    icon: Heart,
    title: "Made with Passion",
    description:
      "Every design is carefully curated and crafted with attention to detail.",
  },
  {
    icon: Globe,
    title: "Worldwide Reach",
    description:
      "We ship to 180+ countries, bringing unique designs to every corner of the globe.",
  },
  {
    icon: Zap,
    title: "Fast Fulfillment",
    description:
      "Powered by Printful's world-class fulfillment network for fast, reliable delivery.",
  },
  {
    icon: Users,
    title: "Community First",
    description:
      "We're building more than a store — a community of creators and lovers of design.",
  },
];

export default function AboutPage() {
  return (
    <div className="pt-24 pb-16">
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-600/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-800/60 bg-brand-950/40 px-4 py-1.5 text-sm text-brand-500 mb-6">
            <Sparkles className="h-4 w-4" />
            Our Story
          </div>
          <h1 className="section-title mb-6">
            Bringing Creativity to <span className="gradient-text">Life</span>
          </h1>
          <p className="text-lg text-zinc-500 leading-relaxed">
            PrintDrop was founded with a simple belief: everyone deserves to wear
            something that tells their story. We partner with Printful to deliver
            premium quality print-on-demand products that combine stunning
            designs with world-class manufacturing.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-zinc-200 bg-white/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { value: "50K+", label: "Happy Customers", icon: Users },
              { value: "200+", label: "Unique Designs", icon: Star },
              { value: "180+", label: "Countries Shipped", icon: Globe },
              { value: "1M+", label: "Products Delivered", icon: Package },
            ].map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center">
                <Icon className="h-8 w-8 text-brand-600 mx-auto mb-3" />
                <p className="text-3xl font-bold gradient-text">{value}</p>
                <p className="text-sm text-zinc-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-950/60 border border-brand-800/40">
                  <Icon className="h-7 w-7 text-brand-600" />
                </div>
                <h3 className="font-bold text-zinc-900 mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">
            Ready to find your next favorite piece?
          </h2>
          <p className="text-zinc-500 mb-8">
            Browse our full catalog and discover products you&apos;ll love.
          </p>
          <Link href="/shop" className="btn-primary text-base px-8 py-3.5">
            Shop Now
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* SEO content section */}
      <section className="py-16 bg-zinc-50 border-t border-zinc-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="prose prose-zinc max-w-none">
            <h2 className="text-2xl font-bold text-zinc-900 mb-6">About PrintDrop — Artist-Designed Custom Apparel for the USA</h2>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-3">What We Make</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  PrintDrop is an independent artist-run store specializing in unique graphic t-shirts, hoodies,
                  sweatshirts, mugs, posters, stickers, and accessories. Every single product starts as original
                  artwork — designed with a specific mood, message, or aesthetic in mind — then printed on
                  premium blanks using Direct-to-Garment (DTG) technology or embroidery.
                </p>
                <p className="text-sm text-zinc-600 leading-relaxed mt-3">
                  We don&apos;t mass-produce. Each item is printed on demand when you order it, meaning no
                  waste, no overstock, and every piece feels special. Whether you&apos;re shopping for yourself
                  or looking for a unique gift for someone you care about, you&apos;ll find something here that
                  you can&apos;t find anywhere else.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-3">Who We Make It For</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Our customers across the USA are people who want to express themselves through what they wear
                  and own. Art lovers, creative professionals, gift-givers who hate giving boring presents, and
                  anyone tired of seeing the same mass-produced designs everywhere — this store is built for you.
                </p>
                <p className="text-sm text-zinc-600 leading-relaxed mt-3">
                  Our catalog covers a wide range of styles: retro aesthetics, nature-inspired art, minimalist
                  typography, bold pop culture references, and more. New designs are added regularly, so there&apos;s
                  always something fresh to discover.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-3">How It Works</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  PrintDrop is powered by <strong>Printful</strong>, one of the world&apos;s leading print-on-demand
                  fulfillment companies. When you place an order, Printful prints and ships your item directly
                  to your door — typically within 7–10 business days for US orders. This partnership lets us
                  focus on what we do best: creating great art and curating products you&apos;ll love.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-3">Quality You Can Feel</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  We only offer products that meet our quality bar. T-shirts are soft, true-to-size, and
                  hold their print wash after wash. Mugs are dishwasher-safe. Posters are printed on
                  heavyweight paper with archival inks. If you&apos;re not satisfied, our 30-day return policy
                  means you can shop with zero risk.
                </p>
              </div>
            </div>

            <div className="mt-8 p-5 bg-white rounded-2xl border border-zinc-200">
              <h3 className="text-base font-semibold text-zinc-800 mb-2">Popular searches that bring people to PrintDrop</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Customers find us searching for:{" "}
                <span className="text-zinc-700">custom graphic tees USA</span>,{" "}
                <span className="text-zinc-700">unique gifts for art lovers</span>,{" "}
                <span className="text-zinc-700">artist designed hoodies</span>,{" "}
                <span className="text-zinc-700">print on demand apparel</span>,{" "}
                <span className="text-zinc-700">funny t-shirts for her</span>,{" "}
                <span className="text-zinc-700">retro graphic tee shop</span>,{" "}
                <span className="text-zinc-700">custom mugs and posters</span>, and{" "}
                <span className="text-zinc-700">independent artist clothing brand</span>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
