"use client";

import { useState } from "react";
import ImageCarousel from "./ImageCarousel";
import { BLOG_IDEAS } from "@/constants/blogIdeas";

export default function TestBlogGenerate() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState("");
  const [optionalImages, setOptionalImages] = useState(["", "", ""]);
  const [selectedImages, setSelectedImages] = useState<{
    [key: number]: string;
  }>({});

  // Get today's blog idea
  const today = new Date().toISOString().split("T")[0];
  const todaysBlogIdea =
    BLOG_IDEAS.find((idea) => idea.date === today) || BLOG_IDEAS[0];

  const handleOptionalImageChange = (index: number, value: string) => {
    setOptionalImages((prev) => {
      const newImages = [...prev];
      newImages[index] = value;
      return newImages;
    });
    // Update selectedImages state
    if (value) {
      setSelectedImages((prev) => ({ ...prev, [index + 2]: value }));
    } else {
      const { [index + 2]: _, ...rest } = selectedImages;
      setSelectedImages(rest);
    }
  };

  const handleImageSelect = (imageUrl: string, position: number) => {
    if (position === 1) {
      setCoverImage(imageUrl);
    } else if (position >= 2 && position <= 4) {
      handleOptionalImageChange(position - 2, imageUrl);
    }

    // Update selectedImages state
    if (imageUrl) {
      setSelectedImages((prev) => ({ ...prev, [position]: imageUrl }));
    } else {
      const { [position]: _, ...rest } = selectedImages;
      setSelectedImages(rest);
    }
  };

  const handleGenerateBlog = async () => {
    if (!coverImage.trim()) {
      alert("Cover image URL is required");
      return;
    }

    try {
      setIsLoading(true);
      setResult(null);

      const startTime = Date.now();
      console.log("Starting blog generation...");

      const response = await fetch("/api/cron/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coverImage,
          optionalImages: optionalImages.filter((url) => url.trim() !== ""),
        }),
      });
      const data = await response.json();

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      console.log("Blog generation response:", data);
      console.log(`Time taken: ${duration} seconds`);

      setResult(
        `${data.success ? "✅" : "❌"} ${data.message} (${duration.toFixed(1)}s)`
      );
    } catch (error) {
      console.error("Error generating blog:", error);
      setResult("❌ Failed to generate blog");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="mb-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Today's Blog Topic
        </h3>
        <div className="space-y-2">
          <p className="text-blue-800 font-medium">{todaysBlogIdea.topic}</p>
          <p className="text-sm text-blue-700">
            Target Audience: {todaysBlogIdea.audience}
          </p>
          <p className="text-sm text-blue-600">{todaysBlogIdea.description}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Select Images</h2>
        <ImageCarousel
          onImageSelect={handleImageSelect}
          selectedImages={selectedImages}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Cover Image URL <span className="text-red-500">*</span>
          {selectedImages[1] && (
            <span className="ml-2 text-blue-500 text-xs">(Image 1)</span>
          )}
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="url"
            value={coverImage}
            onChange={(e) => handleImageSelect(e.target.value, 1)}
            placeholder="https://images.unsplash.com/..."
            className="block w-full rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3"
            required
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          This image will be used as the main cover image for your blog post
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {optionalImages.map((url, index) => (
          <div key={index} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Optional Image URL {index + 1}
              {selectedImages[index + 2] && (
                <span className="ml-2 text-blue-500 text-xs">
                  (Image {index + 2})
                </span>
              )}
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="url"
                value={url}
                onChange={(e) =>
                  handleOptionalImageChange(index, e.target.value)
                }
                placeholder="https://images.unsplash.com/..."
                className="block w-full rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={handleGenerateBlog}
            disabled={isLoading || !coverImage.trim()}
            className={`inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm ${
              isLoading || !coverImage.trim()
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            }`}
          >
            {isLoading && (
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
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
            )}
            {isLoading ? "Generating..." : "Generate Blog Post"}
          </button>
          {result && (
            <span
              className={`text-sm ${result.includes("✅") ? "text-green-600" : "text-red-600"}`}
            >
              {result}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
