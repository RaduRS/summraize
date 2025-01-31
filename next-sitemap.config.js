/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://www.summraize.com/",
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: ["/api/*", "/server-sitemap.xml"],
  robotsTxtOptions: {
    additionalSitemaps: ["https://www.summraize.com/server-sitemap.xml"],
  },
};
