import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

/**
 * PayPal Client ID is not a secret — it's safe to expose to the browser
 * (the JS SDK requires it). We serve it via API instead of NEXT_PUBLIC_
 * so it can be managed dynamically from the dashboard settings.
 */
export async function GET() {
  const clientId = await getSetting("payments", "paypal_client_id");
  return NextResponse.json({ clientId });
}
