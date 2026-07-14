/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://printdrop.com",
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
      `${process.env.SITE_URL || "https://printdrop.com"}/server-sitemap.xml`,
    ],
  },
};
