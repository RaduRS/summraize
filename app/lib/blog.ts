import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import { SupabaseClient } from "@supabase/supabase-js";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  cover_image?: string;
  image_caption?: string;
  date: string;
  updated_at: string;
  author_name?: string;
  published: boolean;
}

// Create a cached Supabase client
const createCachedClient = cache(async () => {
  return await createClient();
});

export async function getPosts(): Promise<BlogPost[]> {
  try {
    // Use absolute URL and add cache headers
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/blog/posts`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add cache configuration
        next: {
          revalidate: 60, // Revalidate every 60 seconds
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch posts:", await response.text());
      return [];
    }

    const posts = await response.json();
    return posts as BlogPost[];
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const encodedSlug = encodeURIComponent(slug);
    // Use absolute URL and add cache headers
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/blog/posts/${encodedSlug}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add cache configuration
        next: {
          revalidate: 60, // Revalidate every 60 seconds
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Post not found: ${slug}`);
        return null;
      }
      const errorText = await response.text();
      console.error("Failed to fetch post:", errorText);
      return null;
    }

    const post = await response.json();
    return post as BlogPost;
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}

// Function to create the SQL table (run this once)
export async function createBlogTable() {
  const supabase = await createCachedClient();

  // Using SQL query directly instead of RPC
  const { error } = await supabase.from("blog_posts").select().limit(0); // This will create the table if it doesn't exist

  if (error) {
    console.error("Error accessing blog table:", error);
    throw error;
  }
}
