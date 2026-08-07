import { buildPinterestFeed, escapeXml, type PinterestFeedItem } from "@/lib/pinterest-feed";

export const runtime = "nodejs";
// Pinterest ingests the feed roughly once a day, but the URL is public and may
// be hit more often. Cache for an hour so repeated fetches do not re-query the
// Printify catalogue every time.
export const revalidate = 3600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://veliova.com").replace(/\/$/, "");

/**
 * Product feed for Pinterest retail catalogs.
 *
 * Register this URL under Pinterest Business, Catalogs, Data source. Pinterest
 * fetches it daily and creates or updates a Product Pin per item.
 *
 * Format is RSS 2.0 with the `g:` namespace, the same schema Google Shopping
 * uses and which Pinterest accepts for XML data sources.
 */
function renderItem(item: PinterestFeedItem): string {
  const parts = [
    `      <g:id>${escapeXml(item.id)}</g:id>`,
    `      <g:title>${escapeXml(item.title)}</g:title>`,
    `      <g:description>${escapeXml(item.description)}</g:description>`,
    `      <g:link>${escapeXml(item.link)}</g:link>`,
    `      <g:image_link>${escapeXml(item.image_link)}</g:image_link>`,
    `      <g:price>${escapeXml(item.price)}</g:price>`,
    `      <g:availability>${escapeXml(item.availability)}</g:availability>`,
    `      <g:item_group_id>${escapeXml(item.item_group_id)}</g:item_group_id>`,
    `      <g:condition>new</g:condition>`,
    `      <g:brand>Veliova</g:brand>`,
  ];
  if (item.product_type) {
    parts.push(`      <g:product_type>${escapeXml(item.product_type)}</g:product_type>`);
  }
  return `    <item>\n${parts.join("\n")}\n    </item>`;
}

export async function GET() {
  try {
    const { items } = await buildPinterestFeed(SITE_URL);

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
      `  <channel>`,
      `    <title>Veliova</title>`,
      `    <link>${escapeXml(SITE_URL)}</link>`,
      `    <description>Artist-designed apparel and gifts, printed on demand and shipped across the USA.</description>`,
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
    console.error("[pinterest-feed] Failed to build feed:", err);
    // Return a 503 rather than a partial feed. Pinterest treats a malformed or
    // truncated document as a whole-catalog failure, which would unpublish
    // every existing Pin.
    return new Response("Feed temporarily unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
