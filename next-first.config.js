const fs = require("fs");
const fetch = require("node-fetch");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function fetchBlogPosts() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("❌ Supabase environment variables are missing!");
    process.exit(1);
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
    });

    const posts = await response.json();
    if (!Array.isArray(posts)) throw new Error("Invalid response format");

    const blogUrls = posts
      .filter((post) => post.published) // Only include published posts
      .map((post) => ({
        loc: `https://www.summraize.com/blog/${post.slug}`,
        lastmod: new Date(post.updated_at).toISOString(),
        changefreq: "daily",
        priority: 0.8,
      }));

    fs.writeFileSync("./public/blog-sitemap.json", JSON.stringify(blogUrls, null, 2));
    console.log("✅ Blog sitemap data saved successfully!");
  } catch (error) {
    console.error("❌ Error fetching blog posts:", error);
    process.exit(1);
  }
}

fetchBlogPosts();
