const fs = require("fs");
const fetch = require("node-fetch");
const path = require("path");
const { spawn } = require("child_process");

let serverPort = 3000;

async function fetchBlogPosts() {
  try {
    // Determine if we're in production or development
    const isDevelopment = process.env.NODE_ENV !== "production";
    const baseUrl = isDevelopment
      ? `http://localhost:${serverPort}`
      : "https://www.summraize.com";

    console.log(`\n📡 Fetching blog posts from API (${baseUrl})...`);

    // Use the appropriate URL based on environment
    const response = await fetch(`${baseUrl}/api/blog/posts`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch posts: ${response.status} ${response.statusText}`
      );
    }

    const posts = await response.json();
    console.log(`📚 Found ${posts.length} published blog posts`);

    // Add validation and processing for dates
    const blogUrls = posts
      .filter((post) => post.published)
      .map((post) => {
        // Validate and format the date
        let lastmod;
        try {
          // Try to parse the updated_at date
          lastmod = post.updated_at
            ? new Date(post.updated_at).toISOString()
            : new Date().toISOString(); // Fallback to current date if no updated_at
        } catch (error) {
          console.warn(
            `⚠️ Invalid date for post ${post.slug}, using current date`
          );
          lastmod = new Date().toISOString();
        }

        return {
          loc: `https://www.summraize.com/blog/${post.slug}`,
          lastmod,
          changefreq: "daily",
          priority: 0.8,
        };
      });

    const publicDir = path.join(process.cwd(), "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const sitemapPath = path.join(publicDir, "blog-sitemap.json");
    fs.writeFileSync(sitemapPath, JSON.stringify(blogUrls, null, 2));

    console.log(`\n✅ Blog sitemap saved to ${sitemapPath}`);
    console.log(`📝 Contains ${blogUrls.length} blog URLs\n`);

    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error occurred:");
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    console.error("\nPlease check:");
    console.error(
      isDevelopment
        ? `1. Make sure your development server is running on port ${serverPort}`
        : "1. Make sure your production server is accessible"
    );
    console.error(
      isDevelopment
        ? `2. The API endpoint is accessible at http://localhost:${serverPort}/api/blog/posts`
        : "2. The API endpoint is accessible at https://www.summraize.com/api/blog/posts"
    );
    console.error("3. Check if the API response contains valid date formats");
    console.error("\nExiting with error...\n");
    process.exit(1);
  }
}

// Only start dev server if we're in development
if (process.env.NODE_ENV !== "production") {
  console.log("🚀 Starting development server...");
  const devServer = spawn("npm", ["run", "dev"], {
    stdio: "pipe",
    detached: true,
  });

  // Listen for server output to know when it's ready
  devServer.stdout.on("data", (data) => {
    const output = data.toString();

    // Detect port changes
    const portMatch = output.match(
      /Port (\d+) is in use, trying (\d+) instead/
    );
    if (portMatch) {
      serverPort = parseInt(portMatch[2], 10);
      console.log(`📝 Server will use port ${serverPort}`);
    }

    // Wait for server ready message
    if (output.includes("- Local:")) {
      console.log("✅ Development server is ready");
      // Wait a bit more to ensure the API is fully initialized
      setTimeout(() => {
        fetchBlogPosts().finally(() => {
          // Kill the dev server process and its children
          process.kill(-devServer.pid);
        });
      }, 2000);
    }
  });

  // Handle server errors
  devServer.stderr.on("data", (data) => {
    const output = data.toString();
    console.error(`Dev server error: ${output}`);

    // Also check for port changes in stderr
    const portMatch = output.match(
      /Port (\d+) is in use, trying (\d+) instead/
    );
    if (portMatch) {
      serverPort = parseInt(portMatch[2], 10);
      console.log(`📝 Server will use port ${serverPort}`);
    }
  });

  devServer.on("error", (error) => {
    console.error("Failed to start dev server:", error);
    process.exit(1);
  });
} else {
  // In production, just run fetchBlogPosts directly
  fetchBlogPosts();
}
