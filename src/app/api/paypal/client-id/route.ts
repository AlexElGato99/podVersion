import { NextResponse } from "next/server";

/**
 * PayPal Client ID is not a secret — it's safe to expose to the browser
 * (the JS SDK requires it). We serve it via API instead of NEXT_PUBLIC_
 * so only one env var needs to be managed server-side.
 */
export async function GET() {
  return NextResponse.json({ clientId: process.env.PAYPAL_CLIENT_ID ?? "" });
}
