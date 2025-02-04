import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export const revalidate = 60; // Revalidate every 60 seconds

type Params = Promise<{ slug: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const supabase = await createClient();

    const { data: post, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", decodedSlug)
      .single();

    if (error) {
      console.error("Error fetching blog post:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Blog post not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch blog post" },
        { status: 500 }
      );
    }

    // Add cache headers
    const response = NextResponse.json(post);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );

    return response;
  } catch (error) {
    console.error("Error in get post API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
