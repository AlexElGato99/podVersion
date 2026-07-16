import { getSettingsSection } from "./settings";

async function getPayPalConfig() {
  const s = await getSettingsSection("payments");
  const base =
    s.paypal_environment === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  return { clientId: s.paypal_client_id ?? "", clientSecret: s.paypal_client_secret ?? "", base };
}

async function getAccessToken(): Promise<{ token: string; base: string }> {
  const { clientId, clientSecret, base } = await getPayPalConfig();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PayPal auth error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return { token: data.access_token, base };
}

export interface PayPalOrderItem {
  name: string;
  quantity: number;
  unitAmount: number;
}

/**
 * Create a PayPal order (CAPTURE intent). All amounts must already be
 * server-validated (never trust client-supplied prices).
 */
export async function createPayPalOrder(params: {
  currency: string;
  items: PayPalOrderItem[];
  shippingAmount: number;
  taxAmount: number;
}): Promise<{ id: string }> {
  const { token, base } = await getAccessToken();
  const itemTotal = params.items.reduce((s, i) => s + i.unitAmount * i.quantity, 0);
  const total = itemTotal + params.shippingAmount + params.taxAmount;

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: params.currency,
            value: total.toFixed(2),
            breakdown: {
              item_total: { currency_code: params.currency, value: itemTotal.toFixed(2) },
              shipping: { currency_code: params.currency, value: params.shippingAmount.toFixed(2) },
              tax_total: { currency_code: params.currency, value: params.taxAmount.toFixed(2) },
            },
          },
          items: params.items.map((i) => ({
            name: i.name.slice(0, 127),
            quantity: String(i.quantity),
            unit_amount: { currency_code: params.currency, value: i.unitAmount.toFixed(2) },
          })),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PayPal create order error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return { id: data.id };
}

/**
 * Capture a previously-approved PayPal order. Returns "COMPLETED" on success.
 */
export async function capturePayPalOrder(orderId: string): Promise<{
  status: string;
  payerEmail?: string;
  captureId?: string;
}> {
  const { token, base } = await getAccessToken();
  const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal capture error ${res.status}: ${JSON.stringify(data)}`);
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status,
    payerEmail: data.payer?.email_address,
    captureId: capture?.id,
  };
}
