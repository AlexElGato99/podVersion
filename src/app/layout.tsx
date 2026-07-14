import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const SITE_URL = process.env.SITE_URL || "https://printdrop.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Custom Print-on-Demand Apparel & Gifts | PrintDrop",
    template: "%s | PrintDrop",
  },
  description:
    "Shop unique custom graphic tees, hoodies, mugs, posters and gifts at PrintDrop. Artist-designed print-on-demand products shipped across the USA — free shipping on orders $50+.",
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
    siteName: "PrintDrop",
    title: "Custom Print-on-Demand Apparel & Gifts | PrintDrop",
    description: "Shop unique custom graphic tees, hoodies, mugs, posters and gifts at PrintDrop. Artist-designed, printed & shipped across the USA.",
  },
  twitter: {
    card: "summary_large_image",
    site: "@printdrop",
    title: "Custom Print-on-Demand Apparel & Gifts | PrintDrop",
    description: "Artist-designed graphic tees, hoodies & gifts. Printed on demand, shipped across the USA. Free shipping on orders $50+.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: { canonical: SITE_URL },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "PrintDrop",
  "url": SITE_URL,
  "logo": `${SITE_URL}/logo.png`,
  "description": "Artist-designed print-on-demand apparel and gifts, shipped across the USA.",
  "sameAs": [],
};

const storeSchema = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "name": "PrintDrop",
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
      <body>{children}</body>
    </html>
  );
}
