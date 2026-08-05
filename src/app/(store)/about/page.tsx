import Link from "next/link";
import { Sparkles, Heart, Globe, Zap, Users, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "About Veliova — An Independent Brand Built On Our Own Terms",
  description: "Veliova started on Etsy and Merch by Amazon — now it's our own independent store, built so we can control the whole experience and do right by every customer.",
  keywords: ["about veliova", "independent artist store", "custom apparel USA", "print on demand brand", "artist designed clothing"],
  alternates: { canonical: "https://veliova.com/about" },
  openGraph: {
    title: "About Veliova — An Independent Brand Built On Our Own Terms",
    description: "Veliova started on Etsy and Merch by Amazon — now it's our own independent store, built for a better, more direct customer experience.",
    url: "https://veliova.com/about",
    type: "website",
  },
};

const VALUE_ICONS = [Heart, Globe, Zap, Users];

interface AboutValue {
  title: string;
  description: string;
}

interface AboutSettings {
  badge_text: string;
  headline: string;
  subheadline: string;
  story_paragraphs: string[];
  values: AboutValue[];
  cta_title: string;
  cta_subtitle: string;
}

const DEFAULTS: AboutSettings = {
  badge_text: "Our Story",
  headline: "From Etsy & Amazon to Our Own Home",
  subheadline:
    "Veliova started as another shop among many — selling on Etsy and Merch by Amazon. Now it's something we built and control ourselves: a small, independent brand focused on doing one thing really well.",
  story_paragraphs: [
    "Before Veliova, we were already selling print-on-demand designs on Etsy and Merch by Amazon — two great platforms that taught us a lot about what customers actually want. But selling on a marketplace means sharing the stage: someone else controls the search results, the checkout experience, the branding, even how customers reach us when something goes wrong.",
    "We wanted more than that. So we started Veliova as our own small brand — a place where we control every part of the experience, from the first design sketch to the moment your order arrives at your door. No algorithm deciding whether you get found. No generic marketplace checkout. Just a store we've built and stand behind ourselves.",
    "We're still a small team, and we like it that way. Every design is picked with care, every order matters, and every customer gets our full attention — not because a platform requires it, but because it's how we actually want to run this.",
  ],
  values: [
    { title: "Made with Care", description: "Every design is chosen and refined by us, not mass-generated — because we're building something we're proud to put our name on." },
    { title: "Our Own Platform", description: "Veliova is fully ours — not a storefront borrowed from a marketplace. That means a more direct, better-controlled experience for you." },
    { title: "Made to Order", description: "Every item is printed after you order it, through trusted print-on-demand manufacturing partners — so nothing sits in a warehouse before it's yours." },
    { title: "A Small Team, Directly Reachable", description: "When you reach out to us, you're talking to the people who actually run Veliova — not a marketplace support queue." },
  ],
  cta_title: "Ready to find your next favorite piece?",
  cta_subtitle: "Browse our full catalog and discover products you'll love.",
};

async function getAboutSettings(): Promise<AboutSettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("about_settings").select("*").eq("id", 1).single();
    if (data) {
      const { id: _id, updated_at: _u, ...rest } = data;
      const merged = { ...DEFAULTS, ...rest };
      if (!merged.story_paragraphs?.length) merged.story_paragraphs = DEFAULTS.story_paragraphs;
      if (!merged.values?.length) merged.values = DEFAULTS.values;
      return merged;
    }
  } catch { /* fall through */ }
  return DEFAULTS;
}

export default async function AboutPage() {
  const about = await getAboutSettings();

  return (
    <div className="pt-20 sm:pt-32 pb-16">
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-600/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-800/60 bg-brand-950/40 px-4 py-1.5 text-sm text-brand-500 mb-6">
            <Sparkles className="h-4 w-4" />
            {about.badge_text}
          </div>
          <h1 className="section-title mb-6">
            {about.headline}
          </h1>
          <p className="text-lg text-zinc-500 leading-relaxed">
            {about.subheadline}
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 border-y border-zinc-200 bg-white/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-5">
          {about.story_paragraphs.map((p, i) => (
            <p key={i} className="text-base text-zinc-600 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {about.values.map((value, i) => {
              const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
              return (
                <div key={value.title} className="card p-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-950/60 border border-brand-800/40">
                    <Icon className="h-7 w-7 text-brand-600" />
                  </div>
                  <h3 className="font-bold text-zinc-900 mb-2">{value.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">
            {about.cta_title}
          </h2>
          <p className="text-zinc-500 mb-8">
            {about.cta_subtitle}
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
            <h2 className="text-2xl font-bold text-zinc-900 mb-6">About Veliova — An Independent Brand, Built On Our Own Terms</h2>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-3">What We Make</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Veliova specializes in unique graphic t-shirts, hoodies, sweatshirts, mugs, posters, stickers,
                  and accessories. Every product starts as original artwork — designed with a specific mood,
                  message, or aesthetic in mind — then printed on premium blanks using Direct-to-Garment (DTG)
                  or Direct-to-Film (DTF) printing, or embroidery.
                </p>
                <p className="text-sm text-zinc-600 leading-relaxed mt-3">
                  We don&apos;t mass-produce. Each item is printed on demand when you order it, meaning no
                  waste, no overstock, and every piece feels special. We still sell on Etsy and Merch by Amazon
                  too — but Veliova is where we control the whole experience ourselves.
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
                  When you place an order, our print-on-demand manufacturing partners produce and ship your
                  item directly to your door — typically within a week or two for US orders. Working this way
                  lets our small team focus on what we do best: designing art worth wearing and standing
                  behind every order ourselves, rather than handing that off to a marketplace.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 mb-3">Quality You Can Feel</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  We only offer products that meet our quality bar. T-shirts are soft, true-to-size, and
                  hold their print wash after wash. Mugs are dishwasher-safe. Posters are printed on
                  heavyweight paper with archival inks. If you&apos;re not satisfied, our 30-day return policy
                  means you can shop with confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
