import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const SITE_URL = process.env.SITE_URL || "https://veliova.com";

export const metadata: Metadata = {
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
};

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
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
