import { buildFacebookFeed, escapeXml, type FacebookFeedItem } from "@/lib/facebook-feed";

export const runtime = "nodejs";
/**
 * Facebook Merchant Center ingests feeds daily. Cache for 1 hour to reduce
 * repeated Printify/Printful catalogue queries.
 */
export const revalidate = 3600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://veliova.com").replace(/\/$/, "");

/**
 * Product feed for Facebook Merchant Center.
 *
 * Register this URL in Facebook Business Suite → Catalog → Data Source (XML).
 * Facebook fetches it daily and creates or updates products in your catalog,
 * which can then be used in dynamic ads, shop sections, and the Facebook shop.
 *
 * Format is XML using the same schema as Google Merchant Center for compatibility.
 */
function renderItem(item: FacebookFeedItem): string {
  const parts = [
    `      <g:id>${escapeXml(item.id)}</g:id>`,
    `      <g:title>${escapeXml(item.title)}</g:title>`,
    `      <g:description>${escapeXml(item.description)}</g:description>`,
    `      <g:link>${escapeXml(item.link)}</g:link>`,
    `      <g:image_link>${escapeXml(item.image_link)}</g:image_link>`,
    `      <g:price>${escapeXml(item.price)}</g:price>`,
    `      <g:currency>${escapeXml(item.currency)}</g:currency>`,
    `      <g:availability>${escapeXml(item.availability)}</g:availability>`,
    `      <g:item_group_id>${escapeXml(item.item_group_id)}</g:item_group_id>`,
    `      <g:condition>${escapeXml(item.condition)}</g:condition>`,
    `      <g:brand>${escapeXml(item.brand)}</g:brand>`,
    `      <g:quantity>${escapeXml(item.quantity)}</g:quantity>`,
  ];

  if (item.category) {
    parts.push(`      <g:product_type>${escapeXml(item.category)}</g:product_type>`);
  }
  if (item.color) {
    parts.push(`      <g:color>${escapeXml(item.color)}</g:color>`);
  }
  if (item.size) {
    parts.push(`      <g:size>${escapeXml(item.size)}</g:size>`);
  }
  if (item.material) {
    parts.push(`      <g:material>${escapeXml(item.material)}</g:material>`);
  }

  return `    <item>\n${parts.join("\n")}\n    </item>`;
}

export async function GET() {
  try {
    const { items } = await buildFacebookFeed(SITE_URL);

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
      `  <channel>`,
      `    <title>Veliova - Facebook Merchant Center</title>`,
      `    <link>${escapeXml(SITE_URL)}</link>`,
      `    <description>Premium print-on-demand apparel and gifts. All products printed on-demand and shipped worldwide.</description>`,
      `    <lastBuildDate>${new Date().toISOString()}</lastBuildDate>`,
      ...items.map(renderItem),
      `  </channel>`,
      `</rss>`,
    ].join("\n");

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[facebook-feed] Failed to build feed:", err);
    // Return 503 if feed building fails to prevent partial/invalid feeds
    return new Response("Feed temporarily unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
