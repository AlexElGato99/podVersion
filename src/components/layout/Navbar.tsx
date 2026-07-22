"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Menu, X, Search, User, ChevronDown } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";

const categories = [
  { label: "T-Shirts",     href: "/shop?category=t-shirts" },
  { label: "Hoodies",      href: "/shop?category=hoodies" },
  { label: "Mugs",         href: "/shop?category=mugs" },
  { label: "Posters",      href: "/shop?category=posters" },
  { label: "Hats",         href: "/shop?category=hats" },
  { label: "Accessories",  href: "/shop?category=accessories" },
  { label: "Phone Cases",  href: "/shop?category=phone-cases" },
  { label: "Tote Bags",    href: "/shop?category=tote-bags" },
  { label: "Wall Art",     href: "/shop?category=wall-art" },
  { label: "Stickers",     href: "/shop?category=stickers" },
];

const navLinks = [
  { label: "Shop", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "About", href: "/about" },
];

const clothingLinks = [
  { label: "All Clothing",          href: "/shop?category=clothing" },
  { label: "T-Shirts",              href: "/shop?category=t-shirts" },
  { label: "Hoodies & Sweatshirts", href: "/shop?category=hoodies" },
  { label: "Hats",                  href: "/shop?category=hats" },
  { label: "Tank Tops",             href: "/shop?category=tank-tops" },
];

const giftsLinks = [
  { label: "All Gifts",    href: "/shop?category=gifts" },
  { label: "Mugs",         href: "/shop?category=mugs" },
  { label: "Posters",      href: "/shop?category=posters" },
  { label: "Tote Bags",    href: "/shop?category=tote-bags" },
  { label: "Wall Art",     href: "/shop?category=wall-art" },
];

const phoneCasesLinks = [
  { label: "All Phone Cases", href: "/shop?category=phone-cases" },
  { label: "iPhone Cases",    href: "/shop?category=iphone-cases" },
  { label: "Samsung Cases",   href: "/shop?category=samsung-cases" },
];

const stickersLinks = [
  { label: "All Stickers",   href: "/shop?category=stickers" },
  { label: "Die-Cut",        href: "/shop?category=die-cut-stickers" },
  { label: "Kiss-Cut",       href: "/shop?category=kiss-cut-stickers" },
  { label: "Sticker Sheets", href: "/shop?category=sticker-sheets" },
];

export default function Navbar() {
  const [scrolled, setScrolled]         = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [catOpen, setCatOpen]           = useState(false);
  const [clothingOpen, setClothingOpen] = useState(false);
  const [giftsOpen, setGiftsOpen]       = useState(false);
  const [phonesOpen, setPhonesOpen]     = useState(false);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [mobileClothingOpen, setMobileClothingOpen] = useState(false);
  const [mobileGiftsOpen, setMobileGiftsOpen]       = useState(false);
  const [mobilePhonesOpen, setMobilePhonesOpen]     = useState(false);
  const [mobileStickersOpen, setMobileStickersOpen] = useState(false);
  const [query, setQuery]               = useState("");
  const { totalItems } = useCart();
  const router = useRouter();
  const catRef      = useRef<HTMLDivElement>(null);
  const clothingRef = useRef<HTMLDivElement>(null);
  const giftsRef    = useRef<HTMLDivElement>(null);
  const phonesRef   = useRef<HTMLDivElement>(null);
  const stickersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
      if (clothingRef.current && !clothingRef.current.contains(e.target as Node)) setClothingOpen(false);
      if (giftsRef.current && !giftsRef.current.contains(e.target as Node)) setGiftsOpen(false);
      if (phonesRef.current && !phonesRef.current.contains(e.target as Node)) setPhonesOpen(false);
      if (stickersRef.current && !stickersRef.current.contains(e.target as Node)) setStickersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 bg-white transition-shadow duration-200",
        scrolled ? "shadow-md" : "border-b border-zinc-200"
      )}
    >
      {/* ── Main row ── */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center gap-3">

          {/* 1. Logo */}
          <Link href="/" className="shrink-0" aria-label="Veliova home">
            <span className="text-xl font-black tracking-tight">
              <span className="text-brand-600">Veli</span>
              <span className="text-zinc-900">ova</span>
            </span>
          </Link>

          {/* 2. Categories dropdown — right of logo, like Etsy */}
          <div ref={catRef} className="hidden sm:block relative shrink-0">
            <button
              onClick={() => setCatOpen(!catOpen)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors border",
                catOpen
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-800 border-zinc-300 hover:border-zinc-500"
              )}
            >
              Categories
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", catOpen && "rotate-180")} />
            </button>

            {/* Dropdown panel */}
            {catOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl border border-zinc-200 bg-white shadow-xl ring-1 ring-black/5 py-2 z-50">
                {categories.map((cat) => (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    onClick={() => setCatOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                  >
                    {cat.label}
                  </Link>
                ))}
                <div className="mt-1 border-t border-zinc-100 pt-1">
                  <Link
                    href="/shop"
                    onClick={() => setCatOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    Browse all →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* 3. Search bar — centered, takes all available space */}
          <form onSubmit={handleSearch} className="hidden sm:flex flex-1 justify-center">
            <div className="relative w-full max-w-xl">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for anything"
                className="w-full h-[44px] rounded-full border-2 border-zinc-800 bg-white pl-5 pr-14 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-600 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-[36px] w-[36px] flex items-center justify-center rounded-full bg-zinc-800 text-white hover:bg-brand-600 transition-colors"
                aria-label="Search"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          {/* 4. Right actions — Account + Cart only */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <Link
              href="/account"
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium">Account</span>
            </Link>
            <Link
              href="/cart"
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-[10px] font-medium">Cart</span>
              {totalItems > 0 && (
                <span className="absolute top-0 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] font-bold text-white">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile: cart + hamburger */}
          <div className="flex sm:hidden items-center gap-1 ml-auto">
            <Link href="/cart" className="relative flex items-center justify-center w-10 h-10 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-600 text-[8px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              className="flex items-center justify-center w-10 h-10 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── Second row: centered nav links ── */}
        <div className="hidden sm:flex items-center justify-center gap-1 border-t border-zinc-100 py-1.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}

          {/* Clothing dropdown */}
          <div ref={clothingRef} className="relative">
            <button
              onClick={() => setClothingOpen(!clothingOpen)}
              className={cn(
                "flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                clothingOpen
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              )}
            >
              Clothing
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", clothingOpen && "rotate-180")} />
            </button>
            {clothingOpen && (
              <div className="absolute left-0 top-full mt-1 w-52 rounded-2xl border border-zinc-200 bg-white shadow-xl ring-1 ring-black/5 py-2 z-50">
                {clothingLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setClothingOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-2.5 text-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900",
                      item.label === "All Clothing" ? "font-semibold text-brand-600" : "text-zinc-700"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Gifts dropdown */}
          <div ref={giftsRef} className="relative">
            <button
              onClick={() => setGiftsOpen(!giftsOpen)}
              className={cn(
                "flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                giftsOpen
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              )}
            >
              Gifts
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", giftsOpen && "rotate-180")} />
            </button>
            {giftsOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 rounded-2xl border border-zinc-200 bg-white shadow-xl ring-1 ring-black/5 py-2 z-50">
                {giftsLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setGiftsOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-2.5 text-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900",
                      item.label === "All Gifts" ? "font-semibold text-brand-600" : "text-zinc-700"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Phone Cases dropdown */}
          <div ref={phonesRef} className="relative">
            <button
              onClick={() => setPhonesOpen(!phonesOpen)}
              className={cn(
                "flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                phonesOpen
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              )}
            >
              Phone Cases
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", phonesOpen && "rotate-180")} />
            </button>
            {phonesOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 rounded-2xl border border-zinc-200 bg-white shadow-xl ring-1 ring-black/5 py-2 z-50">
                {phoneCasesLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setPhonesOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-2.5 text-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900",
                      item.label === "All Phone Cases" ? "font-semibold text-brand-600" : "text-zinc-700"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Stickers dropdown */}
          <div ref={stickersRef} className="relative">
            <button
              onClick={() => setStickersOpen(!stickersOpen)}
              className={cn(
                "flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                stickersOpen
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              )}
            >
              Stickers
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", stickersOpen && "rotate-180")} />
            </button>
            {stickersOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 rounded-2xl border border-zinc-200 bg-white shadow-xl ring-1 ring-black/5 py-2 z-50">
                {stickersLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setStickersOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-2.5 text-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900",
                      item.label === "All Stickers" ? "font-semibold text-brand-600" : "text-zinc-700"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-zinc-100 bg-white px-4 pt-3 pb-5 shadow-lg">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for anything"
                className="w-full h-10 rounded-full border-2 border-zinc-800 pl-4 pr-10 text-sm focus:outline-none"
              />
              <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-zinc-800 text-white">
                <Search className="h-3 w-3" />
              </button>
            </div>
          </form>

          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2 px-1">Categories</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {categories.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                onClick={() => setMobileOpen(false)}
                className="text-center py-2 px-1 text-xs font-medium text-zinc-700 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-colors"
              >
                {cat.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-zinc-100 pt-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-sm font-medium text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* Clothing accordion */}
            <button
              onClick={() => setMobileClothingOpen(!mobileClothingOpen)}
              className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Clothing
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", mobileClothingOpen && "rotate-180")} />
            </button>
            {mobileClothingOpen && (
              <div className="flex flex-col gap-0.5 pl-4">
                {clothingLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => { setMobileOpen(false); setMobileClothingOpen(false); }}
                    className={cn(
                      "px-3 py-2 text-sm rounded-lg transition-colors",
                      item.label === "All Clothing"
                        ? "font-semibold text-brand-600 hover:bg-brand-50"
                        : "text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Gifts accordion */}
            <button
              onClick={() => setMobileGiftsOpen(!mobileGiftsOpen)}
              className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Gifts
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", mobileGiftsOpen && "rotate-180")} />
            </button>
            {mobileGiftsOpen && (
              <div className="flex flex-col gap-0.5 pl-4">
                {giftsLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => { setMobileOpen(false); setMobileGiftsOpen(false); }}
                    className={cn(
                      "px-3 py-2 text-sm rounded-lg transition-colors",
                      item.label === "All Gifts"
                        ? "font-semibold text-brand-600 hover:bg-brand-50"
                        : "text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Phone Cases accordion */}
            <button
              onClick={() => setMobilePhonesOpen(!mobilePhonesOpen)}
              className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Phone Cases
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", mobilePhonesOpen && "rotate-180")} />
            </button>
            {mobilePhonesOpen && (
              <div className="flex flex-col gap-0.5 pl-4">
                {phoneCasesLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => { setMobileOpen(false); setMobilePhonesOpen(false); }}
                    className={cn(
                      "px-3 py-2 text-sm rounded-lg transition-colors",
                      item.label === "All Phone Cases"
                        ? "font-semibold text-brand-600 hover:bg-brand-50"
                        : "text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Stickers accordion */}
            <button
              onClick={() => setMobileStickersOpen(!mobileStickersOpen)}
              className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Stickers
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", mobileStickersOpen && "rotate-180")} />
            </button>
            {mobileStickersOpen && (
              <div className="flex flex-col gap-0.5 pl-4">
                {stickersLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => { setMobileOpen(false); setMobileStickersOpen(false); }}
                    className={cn(
                      "px-3 py-2 text-sm rounded-lg transition-colors",
                      item.label === "All Stickers"
                        ? "font-semibold text-brand-600 hover:bg-brand-50"
                        : "text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            <Link
              href="/account"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              <User className="h-4 w-4" /> My Account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
