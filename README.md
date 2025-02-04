Objective:
Create a blog feature inside my existing Next.js app to improve SEO. The blog should follow best practices, including:

Start by having a look inside the blog folder. I downloaded a template of what i want the structure to be but maybe we can update the style to be more close to our homepage maybe even using shdacn components. where will we save the blogs inside the project itslef or inside the supabase what is better? do we need to create and call and endpoint to get the posts?

SEO-friendly URLs (e.g., /blog/post-title)
Metadata & Open Graph tags for better search engine ranking
Dynamic generation of blog posts from Supabase (if needed)
Optimized structure & performance using Next.js 14
Lightweight implementation (remove unnecessary files from the template)
Markdown support for easy content management
📌 Features to Implement
1️⃣ Blog Listing Page (/blog)

Displays a list of blog posts with title, excerpt, and publish date.
Fetches data from Supabase (if using a database).
Uses SSG (Static Site Generation) for better SEO performance.
2️⃣ Blog Post Page (/blog/[slug])

Dynamically loads blog content based on slug.
Includes title, meta description, structured data (Schema.org).
Uses Markdown or Supabase content for rendering.
3️⃣ SEO Optimization

Each post should include:
<title> tag with post title
<meta description> for better search ranking
Open Graph & Twitter meta tags for social sharing
Uses Next.js Image Optimization for faster loading times.
4️⃣ Supabase Integration (if needed)

If blog posts are stored in Supabase, query them using @supabase/supabase-js.
Ensure efficient indexing & queries.
5️⃣ Code Cleanup

Remove unnecessary files from the template.
Ensure the code is lightweight & follows best practices.