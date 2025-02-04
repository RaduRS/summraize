import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Create a new post
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["title", "content", "excerpt"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if slug is unique (keep this since the slug is now auto-generated with timestamp)
    const { data: existingPost } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("slug", body.slug)
      .single();

    if (existingPost) {
      return NextResponse.json(
        { error: "An unexpected error occurred with the slug" },
        { status: 400 }
      );
    }

    // Prepare create data
    const createData = {
      title: body.title,
      slug: body.slug.replace(/\s+/g, "-").toLowerCase(), // Convert spaces to dashes
      content: body.content,
      excerpt: body.excerpt,
      published: body.published || false,
      cover_image: body.cover_image || null,
      image_caption: body.image_caption || null,
      author_name: body.author_name || null,
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("blog_posts")
      .insert(createData)
      .select()
      .single();

    if (error) {
      console.error("Error creating blog post:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in create post API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get all posts (including unpublished)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const supabase = await createClient();

    let query = supabase
      .from("blog_posts")
      .select("*")
      .order("date", { ascending: false });

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("Error fetching blog posts:", error);
      return NextResponse.json(
        { error: "Failed to fetch blog posts" },
        { status: 500 }
      );
    }

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Error in get posts API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
