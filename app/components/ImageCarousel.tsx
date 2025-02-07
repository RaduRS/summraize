"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";

interface Image {
  id: string;
  url: string;
  thumb: string;
  description: string | null;
  credit: {
    name: string;
    link: string;
  };
}

interface ImageCarouselProps {
  onImageSelect: (imageUrl: string, position: number) => void;
  selectedImages: { [key: number]: string };
}

export default function ImageCarousel({
  onImageSelect,
  selectedImages,
}: ImageCarouselProps) {
  const [images, setImages] = useState<Image[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchImages = async (page: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/unsplash?page=${page}&perPage=5`);
      const data = await response.json();

      if (data.success) {
        setImages((prev) => {
          const newImages = [...prev];
          const startIndex = (page - 1) * 5;
          data.images.forEach((image: Image, index: number) => {
            newImages[startIndex + index] = image;
          });
          return newImages;
        });
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages(1);
  }, []);

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      fetchImages(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleImageClick = (image: Image) => {
    const imagePositions = Object.entries(selectedImages).find(
      ([position, url]) => url === image.url
    );

    if (imagePositions) {
      onImageSelect("", parseInt(imagePositions[0]));
    } else {
      for (let i = 1; i <= 4; i++) {
        if (!selectedImages[i]) {
          onImageSelect(image.url, i);
          break;
        }
      }
    }
  };

  const handleCopyUrl = async (image: Image) => {
    try {
      await navigator.clipboard.writeText(image.url);
      setCopiedId(image.id);
      setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const visibleImages = images.slice((currentPage - 1) * 5, currentPage * 5);

  const getImagePosition = (imageUrl: string) => {
    return Object.entries(selectedImages).find(
      ([_, url]) => url === imageUrl
    )?.[0];
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center space-x-4 mb-4">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className={`p-2 rounded-full ${
            currentPage === 1
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 grid grid-cols-5 gap-4">
          {visibleImages.map((image) => {
            const position = getImagePosition(image.url);
            return (
              <div key={image.id} className="space-y-2">
                <div
                  className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    position
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-transparent hover:border-gray-300"
                  }`}
                  onClick={() => handleImageClick(image)}
                >
                  {position && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
                      {position}
                    </div>
                  )}
                  <img
                    src={image.thumb}
                    alt={image.description || "Unsplash image"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => handleCopyUrl(image)}
                  className="w-full px-2 py-1 text-xs flex items-center justify-center gap-1 text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                >
                  {copiedId === image.id ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy URL
                    </>
                  )}
                </button>
              </div>
            );
          })}
          {isLoading &&
            Array.from({ length: 5 - visibleImages.length }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="aspect-video bg-gray-200 animate-pulse rounded-lg"
              />
            ))}
        </div>
        <button
          onClick={handleNext}
          disabled={currentPage >= totalPages || isLoading}
          className={`p-2 rounded-full ${
            currentPage >= totalPages || isLoading
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      <p className="text-xs text-gray-500 text-center">
        Click images to assign them as cover (1) or optional images (2-4), or
        use the Copy URL button
      </p>
    </div>
  );
}
