import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Package, ChevronLeft, Truck, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "My Orders",
  description: "View your PrintDrop order history and shipment tracking.",
  robots: { index: false },
};

interface OrderItem {
  name: string;
  quantity: number;
  unitAmount: number;
  imageUrl?: string;
  size?: string;
  color?: string;
}

interface Order {
  id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  items: OrderItem[];
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-600",
  processing: "bg-amber-100 text-amber-700",
  shipped: "bg-blue-100 text-blue-700",
  fulfilled: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-red-100 text-red-700",
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, payment_status, total_amount, currency, items, tracking_number, tracking_url, carrier, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const orderList = (orders ?? []) as Order[];

  return (
    <div className="pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link href="/account" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 mb-6">
          <ChevronLeft className="h-4 w-4" />
          Back to Account
        </Link>

        <h1 className="text-2xl font-bold text-zinc-900 mb-8">My Orders</h1>

        {orderList.length === 0 ? (
          <div className="card p-10 text-center">
            <Package className="mx-auto h-10 w-10 text-zinc-300 mb-4" />
            <p className="text-zinc-500 mb-6">You haven&apos;t placed any orders yet.</p>
            <Link href="/shop" className="btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orderList.map((order) => (
              <div key={order.id} className="card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`badge capitalize ${STATUS_STYLES[order.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                    {order.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                        <Image
                          src={item.imageUrl || "/placeholder-product.jpg"}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{item.name}</p>
                        <p className="text-xs text-zinc-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-zinc-700">
                        {formatPrice(item.unitAmount * item.quantity, order.currency)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
                  <p className="text-sm font-bold text-zinc-900">
                    Total: {formatPrice(order.total_amount, order.currency)}
                  </p>
                  {order.tracking_number ? (
                    <a
                      href={order.tracking_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
                    >
                      <Truck className="h-4 w-4" />
                      Track shipment ({order.carrier})
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-400">Tracking not yet available</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
