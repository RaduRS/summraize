import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import BlogPostForm from "../../components/BlogPostForm";

interface Props {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Edit Post | Summraize`,
    description: "Edit blog post",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EditBlogPost({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", decodedSlug)
    .single();

  if (error || !post) {
    console.error("Error fetching post for editing:", error);
    notFound();
  }

  return (
    <div className="py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">Edit Post: {post.title}</h1>
        <BlogPostForm initialData={post} isEditing={true} />
      </div>
    </div>
  );
}
