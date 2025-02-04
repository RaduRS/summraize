import { Metadata } from "next";
import { getPosts, BlogPost } from "../lib/blog";
import { Suspense } from "react";
import Link from "next/link";

export const revalidate = 0; // Disable caching for this route

export const metadata: Metadata = {
  title: "Blog | Summraize - AI Document Processing Insights",
  description:
    "Explore the latest insights on AI document processing, summarization techniques, and productivity tips from the Summraize team.",
  openGraph: {
    title: "Blog | Summraize - AI Document Processing Insights",
    description:
      "Explore the latest insights on AI document processing, summarization techniques, and productivity tips from the Summraize team.",
    type: "website",
    url: "https://summraize.com/blog",
    siteName: "Summraize Blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | Summraize - AI Document Processing Insights",
    description:
      "Explore the latest insights on AI document processing, summarization techniques, and productivity tips from the Summraize team.",
  },
  alternates: {
    canonical: "https://summraize.com/blog",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

function BlogPostSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow animate-pulse">
      <div className="w-full h-48 bg-gray-200" />
      <div className="p-6">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-full mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  );
}

async function BlogPosts() {
  const posts = await getPosts();

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-600">No posts found</h2>
        <p className="mt-2 text-gray-500">Check back soon for new content!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {posts.map((post: BlogPost) => (
        <article
          key={post.slug}
          className="border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
        >
          {post.cover_image && (
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-48 object-cover"
              width={400}
              height={200}
              loading="lazy"
            />
          )}
          <div className="p-6">
            <time
              className="text-sm text-gray-500"
              dateTime={new Date(post.date).toISOString()}
            >
              {new Date(post.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
            <h2 className="text-xl font-semibold mt-2 mb-3">
              <Link
                href={`/blog/${post.slug}`}
                className="hover:text-blue-600 transition-colors"
              >
                {post.title}
              </Link>
            </h2>
            <p className="text-gray-600 mb-4">{post.excerpt}</p>
            <Link
              href={`/blog/${post.slug}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              Read more →
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function BlogPage() {
  return (
    <div className="container mx-auto max-w-6xl w-full px-5 py-16">
      <h1 className="text-4xl font-bold mb-8">Latest Articles</h1>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <BlogPostSkeleton />
            <BlogPostSkeleton />
            <BlogPostSkeleton />
          </div>
        }
      >
        <BlogPosts />
      </Suspense>
    </div>
  );
}
