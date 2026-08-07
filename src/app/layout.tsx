import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const SITE_URL = process.env.SITE_URL || "https://veliova.com";

interface SiteVerification {
  google_verification?: string;
  bing_verification?: string;
  pinterest_verification?: string;
  yandex_verification?: string;
}

// This layout renders on every request, so the lookup is cached briefly rather
// than hitting the database each time.
let cache: { data: SiteVerification; expires: number } | null = null;
const CACHE_TTL_MS = 60_000;

/**
 * Search-engine ownership-verification codes saved in Dashboard, SEO.
 *
 * Uses the service-role key deliberately: `seo_settings` has row level security
 * enabled with no public policy, so the anon client silently reads back nothing
 * and the verification meta tags never render.
 */
async function getSiteVerification(): Promise<SiteVerification> {
  if (cache && cache.expires > Date.now()) return cache.data;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return {};

  try {
    const supabase = createServiceClient(url, key);
    const { data, error } = await supabase
      .from("seo_settings")
      .select("data")
      .eq("id", "__site__")
      .maybeSingle();

    if (error) {
      console.error("[layout] Could not read site verification codes:", error.message);
      return {};
    }

    const verification = (data?.data ?? {}) as SiteVerification;
    cache = { data: verification, expires: Date.now() + CACHE_TTL_MS };
    return verification;
  } catch (err) {
    console.error("[layout] Could not read site verification codes:", err);
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteVerification();
  const other: Record<string, string> = {};
  if (site.bing_verification) other["msvalidate.01"] = site.bing_verification;
  if (site.pinterest_verification) other["p:domain_verify"] = site.pinterest_verification;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "Custom Print-on-Demand Apparel & Gifts | Veliova",
      template: "%s | Veliova",
    },
    description:
      "Shop unique custom graphic tees, hoodies, mugs, posters and gifts at Veliova. Artist-designed print-on-demand products shipped across the USA — free shipping on orders $50+.",
    keywords: [
      "custom graphic tees", "print on demand USA", "artist designed t-shirts",
      "custom hoodies", "personalized gifts USA", "graphic tee shop",
      "custom apparel online", "unique gifts for her", "unique gifts for him",
      "POD store", "Printful store", "buy graphic tees online",
    ],
    openGraph: {
      type: "website",
      locale: "en_US",
      url: SITE_URL,
      siteName: "Veliova",
      title: "Custom Print-on-Demand Apparel & Gifts | Veliova",
      description: "Shop unique custom graphic tees, hoodies, mugs, posters and gifts at Veliova. Artist-designed, printed & shipped across the USA.",
    },
    twitter: {
      card: "summary_large_image",
      site: "@veliova",
      title: "Custom Print-on-Demand Apparel & Gifts | Veliova",
      description: "Artist-designed graphic tees, hoodies & gifts. Printed on demand, shipped across the USA. Free shipping on orders $50+.",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    icons: { icon: "/logo.svg" },
    alternates: { canonical: SITE_URL },
    verification: {
      ...(site.google_verification ? { google: site.google_verification } : {}),
      ...(site.yandex_verification ? { yandex: site.yandex_verification } : {}),
      ...(Object.keys(other).length ? { other } : {}),
    },
  };
}

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Veliova",
  "url": SITE_URL,
  "logo": `${SITE_URL}/logo.svg`,
  "description": "Artist-designed print-on-demand apparel and gifts, shipped across the USA.",
  "sameAs": [],
};

const storeSchema = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "name": "Veliova",
  "url": SITE_URL,
  "description": "Custom graphic tees, hoodies, mugs and gifts — print on demand, fulfilled by Printful.",
  "currenciesAccepted": "USD",
  "areaServed": "US",
  "priceRange": "$$",
};

// Powers Google's sitelinks search box — matches the real search behavior in
// src/components/layout/Navbar.tsx (`/shop?q=<term>`), so this only asserts
// functionality the site actually has.
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Veliova",
  "url": SITE_URL,
  "potentialAction": {
    "@type": "SearchAction",
    "target": `${SITE_URL}/shop?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
