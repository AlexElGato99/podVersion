import Link from "next/link";
import { Sparkles, MessageCircle, Camera, Users, Play, Mail, MapPin } from "lucide-react";

const footerLinks = {
  Shop: [
    { label: "All Products", href: "/shop" },
    { label: "Collections", href: "/collections" },
    { label: "New Arrivals", href: "/shop?sort=newest" },
    { label: "Best Sellers", href: "/shop?sort=popular" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
  ],
  Support: [
    { label: "FAQ", href: "/faq" },
    { label: "Shipping Info", href: "/shipping" },
    { label: "Returns", href: "/returns" },
    { label: "Contact Us", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

const socials = [
  { icon: MessageCircle, label: "Twitter / X", href: "https://twitter.com" },
  { icon: Camera, label: "Instagram", href: "https://instagram.com" },
  { icon: Users, label: "Facebook", href: "https://facebook.com" },
  { icon: Play, label: "YouTube", href: "https://youtube.com" },
];

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-brand-400" />
              <span className="text-xl font-bold gradient-text">PrintDrop</span>
            </Link>
            <p className="text-sm text-zinc-500 leading-relaxed mb-6">
              Premium print-on-demand products crafted with care and shipped worldwide.
            </p>
            <div className="flex items-center gap-3">
              {socials.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-all hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-4 text-sm font-semibold text-zinc-900">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-500 hover:text-brand-600 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <hr className="my-10 border-zinc-200" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <p>© {new Date().getFullYear()} PrintDrop. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <a
              href="mailto:hello@printdrop.store"
              className="hover:text-brand-600 transition-colors"
            >
              hello@printdrop.store
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
