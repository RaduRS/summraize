"use client";

import { useState, useEffect } from "react";
import { BlogPost } from "../../../lib/blog";

interface RelatedArticleSelectorProps {
  onSelect: (
    articles: Pick<BlogPost, "title" | "slug" | "excerpt" | "cover_image">[]
  ) => void;
}

export default function RelatedArticleSelector({
  onSelect,
}: RelatedArticleSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchArticles = async () => {
      if (!searchTerm) {
        setArticles([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/posts?search=${encodeURIComponent(searchTerm)}`
        );
        if (!res.ok) throw new Error("Failed to fetch articles");
        const data = await res.json();
        setArticles(data);
      } catch (error) {
        console.error("Error searching articles:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchArticles, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleSelect = (article: BlogPost) => {
    const isSelected = selectedArticles.some((a) => a.slug === article.slug);
    let newSelected;

    if (isSelected) {
      newSelected = selectedArticles.filter((a) => a.slug !== article.slug);
    } else {
      newSelected = [...selectedArticles, article];
    }

    setSelectedArticles(newSelected);
    onSelect(
      newSelected.map(({ title, slug, excerpt, cover_image }) => ({
        title,
        slug,
        excerpt,
        cover_image,
      }))
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search articles by title..."
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <svg
              className="animate-spin h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      {articles.length > 0 && (
        <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
          {articles.map((article) => (
            <div
              key={article.slug}
              className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${
                selectedArticles.some((a) => a.slug === article.slug)
                  ? "bg-blue-50"
                  : ""
              }`}
              onClick={() => handleSelect(article)}
            >
              {article.cover_image && (
                <img
                  src={article.cover_image}
                  alt={article.title}
                  className="w-12 h-12 object-cover rounded"
                />
              )}
              <div>
                <h4 className="font-medium">{article.title}</h4>
                <p className="text-sm text-gray-500 truncate">
                  {article.excerpt}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedArticles.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Selected Articles:</h4>
          <div className="space-y-2">
            {selectedArticles.map((article) => (
              <div
                key={article.slug}
                className="flex items-center justify-between bg-gray-50 p-2 rounded"
              >
                <span>{article.title}</span>
                <button
                  onClick={() => handleSelect(article)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
