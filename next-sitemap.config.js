/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl: process.env.SITE_URL || "https://veliova.com",
  generateRobotsTxt: true,
  changefreq: "weekly",
  priority: 0.7,
  sitemapSize: 5000,
  exclude: [
    "/dashboard*",
    "/account*",
    "/auth*",
    "/admin*",
    "/api*",
    "/checkout*",
    "/cart",
    "/server-sitemap.xml",
  ],
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/dashboard", "/account", "/auth", "/admin", "/api", "/checkout", "/cart"] },
    ],
    additionalSitemaps: [
      `${process.env.SITE_URL || "https://veliova.com"}/server-sitemap.xml`,
    ],
  },
  // Marketing/catalog pages that must always be in the sitemap even if
  // next-sitemap's static-route discovery misses them (confirmed missing:
  // "/" and "/shop" were absent from the generated sitemap-0.xml).
  additionalPaths: async () => [
    { loc: "/", changefreq: "daily", priority: 1.0 },
    { loc: "/shop", changefreq: "daily", priority: 0.9 },
  ],
};

export default config;

