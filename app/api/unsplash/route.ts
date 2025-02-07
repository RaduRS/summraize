import { NextResponse } from "next/server";
import { BLOG_IDEAS } from "@/constants/blogIdeas";
import { createApi } from "unsplash-js";

const unsplash = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY!,
});

// Get today's blog idea
function getTodaysBlogIdea() {
  const today = new Date().toISOString().split("T")[0];
  const blogIdea = BLOG_IDEAS.find((idea) => idea.date === today);

  if (!blogIdea) {
    throw new Error("No blog topic found for today");
  }

  return blogIdea;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "5");

    // Get today's blog idea
    const blogIdea = getTodaysBlogIdea();

    // Create search query from topic and description
    const searchQuery = `${blogIdea.topic} ${blogIdea.description}`
      .split(" ")
      .slice(0, 5)
      .join(" ");

    // Search Unsplash
    const result = await unsplash.search.getPhotos({
      query: searchQuery,
      page,
      perPage,
      orientation: "landscape",
    });

    if (!result.response) {
      throw new Error("Failed to fetch images from Unsplash");
    }

    // Transform the response to include only what we need
    const images = result.response.results.map((photo) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      description: photo.description || photo.alt_description,
      credit: {
        name: photo.user.name,
        link: photo.user.links.html,
      },
    }));

    return NextResponse.json({
      success: true,
      images,
      total: result.response.total,
      totalPages: result.response.total_pages,
    });
  } catch (error) {
    console.error("Error fetching Unsplash images:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch images",
      },
      { status: 500 }
    );
  }
}
