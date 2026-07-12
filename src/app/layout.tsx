import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Custom Print-on-Demand Apparel & Gifts | PrintDrop",
    template: "%s | PrintDrop",
  },
  description:
    "Shop unique custom print-on-demand apparel, gifts, and accessories at PrintDrop. Graphic tees, hoodies, mugs, posters & more — free shipping on orders $50+.",
  keywords: ["print on demand", "custom graphic tees", "custom hoodies", "personalized gifts", "POD store", "custom apparel", "graphic t-shirts"],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PrintDrop",
    title: "Custom Print-on-Demand Apparel & Gifts | PrintDrop",
    description: "Shop unique custom print-on-demand apparel, gifts, and accessories at PrintDrop. Graphic tees, hoodies, mugs, posters & more — free shipping on orders $50+.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Print-on-Demand Apparel & Gifts | PrintDrop",
    description: "Shop unique custom print-on-demand apparel, gifts, and accessories at PrintDrop. Free shipping on orders $50+.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
