import { Suspense } from "react";
import { createHash } from "node:crypto";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CartProvider } from "@/context/CartContext";
import PinterestTag from "@/components/analytics/PinterestTag";
import { getSettingsSection } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

/**
 * Enhanced Match lets Pinterest attribute a conversion to a Pinterest user by
 * matching on email. Pinterest accepts a SHA256 hash instead of the raw
 * address, so the email is hashed here on the server and the plain value never
 * reaches client-side JavaScript.
 *
 * This only runs when an admin has explicitly enabled it, because sharing
 * customer identifiers with a third party needs a lawful basis and, in the
 * EU/UK, prior consent.
 */
async function getHashedEmail(enabled: boolean): Promise<string | undefined> {
  if (!enabled) return undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email?.trim().toLowerCase();
    if (!email) return undefined;
    return createHash("sha256").update(email).digest("hex");
  } catch {
    return undefined;
  }
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const analytics = await getSettingsSection("analytics").catch(() => ({} as Record<string, string>));
  const pinterestTagId = analytics.pinterest_tag_id?.trim();
  const enhancedMatch = analytics.pinterest_enhanced_match?.trim().toLowerCase() === "on";
  const hashedEmail = pinterestTagId ? await getHashedEmail(enhancedMatch) : undefined;

  return (
    <CartProvider>
      {pinterestTagId && (
        // useSearchParams inside the tag requires a Suspense boundary, or every
        // route under this layout would be forced into client-side rendering.
        <Suspense fallback={null}>
          <PinterestTag tagId={pinterestTagId} hashedEmail={hashedEmail} />
        </Suspense>
      )}
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </CartProvider>
  );
}
