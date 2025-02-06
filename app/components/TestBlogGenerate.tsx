"use client";

import { useState } from "react";

export default function TestBlogGenerate() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerateBlog = async () => {
    try {
      setIsLoading(true);
      setResult(null);

      const startTime = Date.now();
      console.log("Starting blog generation...");

      const response = await fetch("/api/cron/generate");
      const data = await response.json();

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds

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
    <div className="flex items-center gap-4">
      <button
        onClick={handleGenerateBlog}
        disabled={isLoading}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          isLoading
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        {isLoading ? "Generating..." : "Test Blog Generation"}
      </button>
      {result && <span className="text-sm">{result}</span>}
    </div>
  );
}
