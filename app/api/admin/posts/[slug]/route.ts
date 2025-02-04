import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

type Params = Promise<{ slug: string }>;

// Update a post
export async function PUT(request: Request, { params }: { params: Params }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
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

    // Remove slug validation since we don't allow slug modification

    // Prepare update data
    const updateData = {
      title: body.title,
      content: body.content,
      excerpt: body.excerpt,
      published: body.published,
      cover_image: body.cover_image,
      image_caption: body.image_caption,
      author_name: body.author_name,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("blog_posts")
      .update(updateData)
      .eq("slug", decodedSlug)
      .select()
      .single();

    if (error) {
      console.error("Error updating blog post:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in update post API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete a post
export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const supabase = await createClient();

    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("slug", decodedSlug);

    if (error) {
      console.error("Error deleting blog post:", error);
      return NextResponse.json(
        { error: "Failed to delete blog post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in delete post API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
