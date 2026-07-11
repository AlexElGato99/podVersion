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
  title: "About Us",
  description: "Learn about PrintDrop and our mission.",
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
    </div>
  );
}
