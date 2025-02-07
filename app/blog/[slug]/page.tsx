import { Metadata } from "next";
import { getPost, getPosts } from "../../lib/blog";
import { notFound, redirect } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import {
  X as XIcon,
  LinkedinIcon,
  Facebook,
  PinIcon,
  User2,
  Clock,
  ChevronLeft,
} from "lucide-react";
import StatsBlock from "../components/StatsBlock";
import ChecklistBlock from "../components/ChecklistBlock";
import CodeBlock from "../components/CodeBlock";
import ArticleHeader from "../components/ArticleHeader";
import Quote from "../components/Quote";
import CaseStudies from "../components/CaseStudy";
import RelatedArticles from "../components/RelatedArticles";
import React from "react";
import Link from "next/link";
import remarkGfm from "remark-gfm";

interface BlogPost {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  date: string;
  cover_image?: string;
  author_name?: string;
  updated_at: string;
  image_caption?: string;
}

// Custom component to handle text with URLs
const AutoLinkText = ({ children }: { children: string }) => {
  const urlPattern =
    /\b(?:https?:\/\/)?(?:www\.)?\S+\.(?:com|ai|co|org|net|io|gov|edu|uk|us|ca|de|jp|fr|au|in|it|nl|se|no|es|mil|biz|info|mobi|name|aero|jobs|museum)\b/g;

  const parts = children.split(urlPattern);
  const matches = children.match(urlPattern) || [];

  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {matches[i] && (
            <a
              href={
                matches[i].startsWith("http")
                  ? matches[i]
                  : `http://${matches[i]}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-blue-800 underline"
            >
              {matches[i]}
            </a>
          )}
        </React.Fragment>
      ))}
    </>
  );
};

// Custom components for MDX
const components = {
  StatsBlock,
  ChecklistBlock,
  CodeBlock,
  ArticleHeader,
  Quote,
  CaseStudies,
  RelatedArticles,
  h1: (props: any) => (
    <h1 className="text-4xl font-bold mb-6 mt-12 text-gray-900" {...props} />
  ),
  h2: (props: any) => (
    <h2
      className="text-3xl font-semibold mb-4 mt-10 text-gray-800"
      {...props}
    />
  ),
  h3: (props: any) => (
    <h3 className="text-2xl font-semibold mb-3 mt-8 text-gray-700" {...props} />
  ),
  h4: (props: any) => (
    <h4 className="text-xl font-semibold mb-2 mt-6 text-gray-700" {...props} />
  ),
  strong: (props: any) => {
    const text = props.children;
    // Check if the text starts with a dash and space
    if (typeof text === "string" && text.startsWith("- ")) {
      return (
        <strong className="block mt-4">
          <span className="text-gray-700">-</span> {text.substring(2)}
        </strong>
      );
    }
    return <strong className="font-semibold text-gray-900" {...props} />;
  },
  ul: (props: any) => {
    const items = React.Children.toArray(props.children);

    // Check if it's a checklist
    if (
      items.some(
        (child: any) =>
          child.type === "li" &&
          typeof child.props.children === "string" &&
          (child.props.children.startsWith("[ ]") ||
            child.props.children.startsWith("[x]"))
      )
    ) {
      const checklistItems = items
        .filter((child: any) => child.type === "li")
        .map((child: any) => {
          const text = child.props.children;
          return {
            text: text.replace(/^\[[x\s]\]\s*/, ""),
            checked: text.startsWith("[x]"),
          };
        });
      return <ChecklistBlock items={checklistItems} />;
    }

    // Regular unordered list
    return (
      <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700" {...props} />
    );
  },
  ol: (props: any) => (
    <ol className="list-decimal pl-6 mb-4 space-y-2 text-gray-700" {...props} />
  ),
  li: (props: any) => (
    <li className="mb-1 text-gray-700 leading-relaxed" {...props} />
  ),
  a: (props: any) => (
    <a
      className="text-blue-600 hover:text-blue-800 underline"
      target={props.href?.startsWith("http") ? "_blank" : undefined}
      rel={props.href?.startsWith("http") ? "noopener noreferrer" : undefined}
      {...props}
    />
  ),
  img: (props: any) => (
    <img
      className="rounded-lg shadow-md my-8 mx-0 w-full"
      loading="lazy"
      {...props}
    />
  ),
  pre: (props: any) => <div {...props} />,
  p: (props: any) => {
    const content = props.children;

    // Parse stats block
    if (typeof content === "string" && content.includes("::: stats")) {
      try {
        // Extract the stats block content
        const statsMatch = content.match(/::: stats\s*([\s\S]*?)\s*:::/);
        if (statsMatch) {
          const statsContent = statsMatch[1].trim();
          console.log("Stats content:", statsContent);

          // Parse title
          const titleMatch = statsContent.match(/title:\s*"([^"]+)"/);
          const title = titleMatch ? titleMatch[1] : "Statistics";

          // Parse statistics
          const statistics = Array.from(
            statsContent.matchAll(/value:\s*"([^"]+)"\s+label:\s*"([^"]+)"/g)
          ).map(([_, value, label]) => ({
            value,
            label,
          }));

          if (statistics.length > 0) {
            return <StatsBlock title={title} statistics={statistics} />;
          }
        }
      } catch (error) {
        console.error("Error parsing stats block:", error);
        return (
          <p className="text-lg text-gray-600 mb-4 leading-relaxed text-justify">
            {content}
          </p>
        );
      }
    }

    // Handle URL conversion for regular text
    if (typeof content === "string") {
      return (
        <p className="text-lg text-gray-600 mb-4 leading-relaxed text-justify">
          <AutoLinkText>{content}</AutoLinkText>
        </p>
      );
    }

    return (
      <p
        className="text-lg text-gray-600 mb-4 leading-relaxed text-justify"
        {...props}
      />
    );
  },
  code: ({ children, className }: { children: string; className?: string }) => {
    const language = className?.replace("language-", "") || "plaintext";
    return <CodeBlock code={children} language={language} />;
  },
};

type Params = Promise<{ slug: string }>;

interface Props {
  params: Params;
}

export const revalidate = 0; // Disable caching for this route

// This can run at build time
export async function generateStaticParams() {
  try {
    const posts = await getPosts();
    return posts.map((post) => ({
      slug: post.slug,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) {
    return {
      title: "Post Not Found | Summraize Blog",
      description: "The requested blog post could not be found.",
      robots: "noindex",
    };
  }

  const post = await getPost(slug);

  if (!post) {
    return {
      title: "Post Not Found | Summraize Blog",
      description: "The requested blog post could not be found.",
      robots: "noindex",
    };
  }

  const publishedTime = new Date(post.date).toISOString();

  return {
    title: `${post.title} | Summraize Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: `https://summraize.com/blog/${post.slug}`,
      images: post.cover_image
        ? [
            {
              url: post.cover_image,
              width: 1200,
              height: 630,
              alt: post.title,
            },
          ]
        : undefined,
      publishedTime,
      modifiedTime: publishedTime,
      authors: post.author_name ? [post.author_name] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
    alternates: {
      canonical: `https://summraize.com/blog/${post.slug}`,
    },
    authors: post.author_name ? [{ name: post.author_name }] : undefined,
    publisher: "Summraize",
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
}

// Function to convert spaces to dashes in URLs
const formatUrl = (text: string) => text.replace(/\s+/g, "-").toLowerCase();

// Function to estimate reading time
function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

export default async function BlogPost({ params }: { params: Params }) {
  const { slug } = await params;
  if (!slug) {
    notFound();
  }

  // Format the slug to replace any spaces with dashes
  const formattedSlug = formatUrl(slug);
  if (formattedSlug !== slug) {
    // Redirect to the properly formatted URL
    redirect(`/blog/${formattedSlug}`);
  }

  const post = await getPost(formattedSlug);

  if (!post) {
    notFound();
  }

  const publishDate = new Date(post.date);
  const updateDate = new Date(post.updated_at);
  const readingTime = getReadingTime(post.content);

  // Add logging for MDX components
  const mdxComponents = {
    ...components,
    p: (props: any) => {
      const content = props.children;

      // Parse stats block
      if (typeof content === "string" && content.includes("::: stats")) {
        console.log("Found stats block, attempting to parse");
        try {
          // Extract the stats block content
          const statsMatch = content.match(/::: stats\s*([\s\S]*?)\s*:::/);

          if (statsMatch) {
            const statsContent = statsMatch[1].trim();

            // Parse title
            const titleMatch = statsContent.match(/title:\s*"([^"]+)"/);
            const title = titleMatch ? titleMatch[1] : "Statistics";

            // Parse statistics
            const statistics = Array.from(
              statsContent.matchAll(/value:\s*"([^"]+)"\s+label:\s*"([^"]+)"/g)
            ).map(([_, value, label]) => ({
              value,
              label,
            }));

            if (statistics.length > 0) {
              return <StatsBlock title={title} statistics={statistics} />;
            }
          }
        } catch (error) {
          console.error("Error parsing stats block:", error);
          return (
            <p className="text-lg text-gray-600 mb-4 leading-relaxed text-justify">
              {content}
            </p>
          );
        }
      }

      // Handle URL conversion for regular text
      if (typeof content === "string") {
        return (
          <p className="text-lg text-gray-600 mb-4 leading-relaxed text-justify">
            <AutoLinkText>{content}</AutoLinkText>
          </p>
        );
      }

      return (
        <p
          className="text-lg text-gray-600 mb-4 leading-relaxed text-justify"
          {...props}
        />
      );
    },
    // Add special handling for quotes with apostrophes
    Quote: (props: any) => {
      const sanitizedProps = {
        ...props,
        text: props.text?.replace(/'/g, "'").replace(/"/g, '"'),
      };
      return <Quote {...sanitizedProps} />;
    },
  };

  return (
    <article className="container mx-auto max-w-4xl w-full px-6 py-16">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 mb-8 text-sm flex-row justify-between">
        <Link
          href="/blog"
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1 group"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Blog
        </Link>
        <div className="flex items-center gap-4 text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{readingTime} min read</span>
          </div>
        </div>
      </nav>

      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-6">{post.title}</h1>

        {post.excerpt && (
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-6 border-t border-b">
          {/* Author Info with Icon */}
          <div className="flex items-center mb-4 md:mb-0">
            {post.updated_at && (
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mr-4">
                  <User2 className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <div className="text-gray-900 font-medium">
                    {post.author_name}
                  </div>
                  <time
                    className="text-sm text-gray-500"
                    dateTime={updateDate.toISOString()}
                  >
                    {updateDate.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </div>
              </div>
            )}
          </div>

          {/* Share Links */}
          <div className="flex items-center gap-4">
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                `https://summraize.com/blog/${formatUrl(post.slug)}`
              )}&text=${encodeURIComponent(post.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Share on X (Twitter)"
            >
              <XIcon className="h-5 w-5" />
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                `https://summraize.com/blog/${formatUrl(post.slug)}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Share on LinkedIn"
            >
              <LinkedinIcon className="h-5 w-5" />
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                `https://summraize.com/blog/${formatUrl(post.slug)}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Share on Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a
              href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(
                `https://summraize.com/blog/${formatUrl(post.slug)}`
              )}&media=${encodeURIComponent(
                post.cover_image || ""
              )}&description=${encodeURIComponent(post.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Share on Pinterest"
            >
              <PinIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </header>

      {post.cover_image && (
        <div className="mb-12">
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full rounded-xl shadow-lg"
            width={1200}
            height={630}
          />
          {post.image_caption && (
            <div
              className="mt-2 text-sm text-gray-500 text-center"
              dangerouslySetInnerHTML={{ __html: post.image_caption }}
            />
          )}
        </div>
      )}

      <div className="prose prose-lg max-w-none leading-relaxed">
        <MDXRemote
          source={post.content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              format: "mdx",
              development: false,
              useDynamicImport: true,
            },
          }}
        />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            image: post.cover_image,
            datePublished: publishDate.toISOString(),
            dateModified: publishDate.toISOString(),
            author: post.author_name
              ? {
                  "@type": "Person",
                  name: post.author_name,
                }
              : undefined,
            publisher: {
              "@type": "Organization",
              name: "Summraize",
              logo: {
                "@type": "ImageObject",
                url: "https://summraize.com/logo.png",
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://summraize.com/blog/${post.slug}`,
            },
            keywords: [
              "AI",
              "Document Processing",
              "Summarization",
              "Productivity",
              "Machine Learning",
              "Content Management",
              "Text Analysis",
            ],
          }),
        }}
      />
    </article>
  );
}
