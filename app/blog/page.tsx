import { Metadata } from "next";
import { getPosts, BlogPost } from "../lib/blog";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { useEffect } from "react";
import ScrollToTop from "./components/ScrollToTop";

export const revalidate = 60; // Change to 60 seconds for better caching

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
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-full mb-8" />
        <div className="h-4 bg-gray-200 rounded w-8" />
      </div>
    </div>
  );
}

// Function to estimate reading time
function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
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
      {posts.map((post: BlogPost) => {
        const readingTime = getReadingTime(post.content);
        return (
          <Link
            href={`/blog/${post.slug}`}
            key={post.slug}
            prefetch={true}
            scroll={true}
            className="group relative flex flex-col border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 bg-white h-full transform hover:-translate-y-1"
          >
            <div className="relative h-48 overflow-hidden">
              {post.cover_image ? (
                <Image
                  src={post.cover_image}
                  alt={post.title}
                  className="object-cover transform group-hover:scale-105 transition-transform duration-200"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                  <span className="text-blue-500 text-lg font-medium">
                    Summraize Blog
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col flex-grow p-6">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <time dateTime={new Date(post.date).toISOString()}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{readingTime} min read</span>
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-3 text-gray-900 group-hover:text-blue-600 transition-colors">
                {post.title}
              </h2>
              <p className="text-gray-600 mb-6 flex-grow">{post.excerpt}</p>
              <div className="flex items-center text-blue-600 group-hover:text-blue-800">
                <span className="text-sm font-medium">Read article</span>
                <svg
                  className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function BlogPage() {
  return (
    <div className="container mx-auto max-w-6xl w-full px-5 py-16">
      <ScrollToTop />
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
