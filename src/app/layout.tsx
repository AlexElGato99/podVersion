import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CartProvider } from "@/context/CartContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "PrintDrop — Premium Print on Demand",
    template: "%s | PrintDrop",
  },
  description:
    "Premium print-on-demand products crafted with care. Unique designs on apparel, accessories, and more. Powered by Printful.",
  keywords: ["print on demand", "custom clothing", "POD", "merch"],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PrintDrop",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <CartProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
