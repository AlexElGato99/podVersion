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
    "/api*",
    "/checkout*",
    "/cart",
  ],
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/dashboard", "/account", "/auth", "/api", "/checkout", "/cart"] },
    ],
    additionalSitemaps: [
      `${process.env.SITE_URL || "https://veliova.com"}/server-sitemap.xml`,
    ],
  },
};

export default config;

