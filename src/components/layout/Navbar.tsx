"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Menu,
  X,
  Search,
  User,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Shop", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [heroBg, setHeroBg] = useState<string | null>(null);
  const { totalItems } = useCart();
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Read hero bg CSS variable once mounted (set by the hero section via <style>)
  useEffect(() => {
    if (!isHome) { setHeroBg(null); return; }
    const from = getComputedStyle(document.documentElement).getPropertyValue("--hero-bg-from").trim();
    if (from) setHeroBg(from);
  }, [isHome, pathname]);

  const navBg = isHome && !scrolled && heroBg
    ? `${heroBg}e6`   // hero color at ~90% opacity
    : undefined;

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-zinc-200 shadow-sm"
          : isHome && heroBg
            ? "backdrop-blur-sm border-b border-white/20"
            : "bg-white/80 backdrop-blur-sm border-b border-zinc-100"
      )}
      style={navBg ? { backgroundColor: navBg } : undefined}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Sparkles className="h-6 w-6 text-brand-400 group-hover:text-brand-300 transition-colors" />
          <span className="text-xl font-bold gradient-text">PrintDrop</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === link.href
                  ? "text-brand-600 bg-brand-50"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <button className="btn-ghost" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          <Link href="/account" className="btn-ghost" aria-label="Account">
            <User className="h-4 w-4" />
          </Link>
          <Link href="/cart" className="btn-ghost relative" aria-label="Cart">
            <ShoppingCart className="h-4 w-4" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </Link>
          <Link href="/shop" className="btn-primary ml-2">
            Shop Now
          </Link>
        </div>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/cart" className="btn-ghost relative" aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>
          <button
            className="btn-ghost"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-100 bg-white px-4 pb-6 pt-4">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "text-brand-600 bg-brand-50"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                )}
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-3 border-zinc-100" />
            <Link
              href="/account"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            >
              <User className="h-4 w-4" />
              Account
            </Link>
            <Link
              href="/shop"
              onClick={() => setMobileOpen(false)}
              className="btn-primary mt-2"
            >
              Shop Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
