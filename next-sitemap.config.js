const fs = require("fs");

const siteUrl = process.env.SITE_URL || "https://www.summraize.com/";

// Read the pre-fetched blog posts from JSON file
let blogPosts = [];
try {
  const data = fs.readFileSync("./public/blog-sitemap.json", "utf8");
  blogPosts = JSON.parse(data);
} catch (error) {
  console.warn(
    "⚠️ Blog sitemap JSON not found or invalid. Running without blog posts."
  );
}

module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: ["/admin/*", "/api/*", "/server-sitemap.xml"], // Excluding unnecessary routes
  additionalPaths: async () => blogPosts, // Adding dynamic blog posts
  robotsTxtOptions: {
    additionalSitemaps: [`${siteUrl}server-sitemap.xml`], // Extra sitemaps (if any)
  },
};
