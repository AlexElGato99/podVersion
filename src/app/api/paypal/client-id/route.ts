import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

/**
 * PayPal Client ID is not a secret — it's safe to expose to the browser
 * (the JS SDK requires it). We serve it via API instead of NEXT_PUBLIC_
 * so it can be managed dynamically from the dashboard settings.
 */
export async function GET() {
  try {
    const clientId = await getSetting("payments", "paypal_client_id");
    if (!clientId) {
      console.error(
        "[api/paypal/client-id] No PayPal client ID resolved — check that PAYPAL_CLIENT_ID " +
        "is set in your deployment's environment variables (and redeploy after adding it), " +
        "or save it under Dashboard → Settings → Payments."
      );
    }
    return NextResponse.json({ clientId });
  } catch (err) {
    console.error("[api/paypal/client-id]", err);
    return NextResponse.json({ clientId: "", error: "Failed to load PayPal settings" }, { status: 500 });
  }
}
