/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://summraize.vercel.app/",
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: ["/api/*", "/server-sitemap.xml"],
  robotsTxtOptions: {
    additionalSitemaps: ["https://summraize.vercel.app/server-sitemap.xml"],
  },
};
