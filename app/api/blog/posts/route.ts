import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export const revalidate = 60; // Revalidate every 60 seconds

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select(
        "id, slug, title, excerpt, content, cover_image, date, author_name, published"
      )
      .eq("published", true)
      .order("date", { ascending: false })
      .returns<any>();

    if (error) {
      console.error("Error fetching blog posts:", error);
      return NextResponse.json(
        { error: "Failed to fetch blog posts" },
        { status: 500 }
      );
    }

    // Add comprehensive cache headers for better performance
    const response = NextResponse.json(posts);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );
    response.headers.set("CDN-Cache-Control", "public, max-age=60");
    response.headers.set("Vercel-CDN-Cache-Control", "public, max-age=60");
    response.headers.set("X-Content-Type-Options", "nosniff");

    return response;
  } catch (error) {
    console.error("Error in blog posts API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
