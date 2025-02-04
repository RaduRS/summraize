import { Metadata } from "next";
import BlogPostForm from "../components/BlogPostForm";

export const metadata: Metadata = {
  title: "New Blog Post | Summraize",
  description: "Create a new blog post",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewBlogPost() {
  return (
    <div className="py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">Create New Post</h1>
        <BlogPostForm />
      </div>
    </div>
  );
}
