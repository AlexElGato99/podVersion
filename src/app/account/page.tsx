import { redirect } from "next/navigation";
import Link from "next/link";
import {
  User,
  Package,
  Heart,
  Settings,
  LogOut,
  ShoppingBag,
  MapPin,
  Bell,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "My Account",
};

const menuItems = [
  { icon: Package, label: "My Orders", href: "/account/orders", desc: "Track and manage your orders" },
  { icon: Heart, label: "Wishlist", href: "/account/wishlist", desc: "Items you've saved" },
  { icon: MapPin, label: "Addresses", href: "/account/addresses", desc: "Manage shipping addresses" },
  { icon: CreditCard, label: "Payment Methods", href: "/account/payments", desc: "Saved cards and billing" },
  { icon: Bell, label: "Notifications", href: "/account/notifications", desc: "Email and push preferences" },
  { icon: Settings, label: "Settings", href: "/account/settings", desc: "Account and privacy settings" },
];

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <div className="pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Profile header */}
        <div className="card p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 text-3xl font-bold text-white shadow-lg shadow-brand-900/40">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">{displayName}</h1>
              <p className="text-zinc-500 mt-1">{user.email}</p>
              <span className="mt-2 badge bg-brand-950/60 border border-brand-800/40 text-brand-400">
                <User className="h-3 w-3" />
                Member
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: "Total Orders", value: "0" },
              { label: "Wishlist Items", value: "0" },
              { label: "Points Earned", value: "0" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-zinc-800/40 p-4 text-center"
              >
                <p className="text-2xl font-bold gradient-text">{stat.value}</p>
                <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Menu grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {menuItems.map(({ icon: Icon, label, href, desc }) => (
            <Link
              key={href}
              href={href}
              className="card flex items-center gap-4 p-5 transition-all hover:border-zinc-700 hover:-translate-y-0.5 group"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-950/60 border border-brand-800/40">
                <Icon className="h-5 w-5 text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-100 group-hover:text-brand-300 transition-colors">
                  {label}
                </p>
                <p className="text-xs text-zinc-500 truncate">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <div className="mt-6">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full card flex items-center justify-center gap-3 p-4 text-sm font-medium text-red-400 hover:bg-red-950/20 hover:border-red-900/40 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
