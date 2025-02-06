import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";
export const preferredRegion = "auto";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Set maximum duration to 5 minutes

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL;

if (!DEEPSEEK_API_URL) {
  throw new Error("DEEPSEEK_API_URL is not configured");
}

const BLOG_PROMPT = `Generate a comprehensive blog post about AI, machine learning, or productivity tools. The post should be informative, engaging, and follow this structure:

1. An attention-grabbing title
2. A brief excerpt summarizing the main points
3. Detailed content with proper markdown formatting
4. Include relevant statistics or case studies where appropriate

The response should be a JSON object matching this structure:
{
  title: string,
  slug: string (URL-friendly version of the title),
  content: string (markdown formatted),
  excerpt: string,
  date: string (ISO format),
  author_name: "AI Content Team",
  updated_at: string (ISO format),
  cover_image: string (optional URL),
  image_caption: string (optional)
}

Make sure the content is high-quality, well-researched, and provides value to readers. Include proper markdown formatting with headers (##), bullet points, and emphasis where appropriate.`;

export async function GET() {
  try {
    // Check if Deepseek API key is configured
    if (!DEEPSEEK_API_KEY) {
      throw new Error("Deepseek API key is not configured");
    }

    const supabase = await createClient();

    // Generate blog post using Deepseek
    const response = await fetch(DEEPSEEK_API_URL as string, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: BLOG_PROMPT,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepseek API error (${response.status}): ${errorText}`);
    }

    const completion = await response.json();
    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error("Missing content in Deepseek API response");
    }

    const generatedPost = JSON.parse(completion.choices[0].message.content);

    // Validate the generated post structure
    const requiredFields = ["title", "slug", "content", "date", "updated_at"];
    for (const field of requiredFields) {
      if (!generatedPost[field]) {
        throw new Error(`Generated post is missing required field: ${field}`);
      }
    }

    // Insert the post into the database
    const { error: insertError } = await supabase.from("blog_posts").insert({
      title: generatedPost.title,
      slug: generatedPost.slug,
      content: generatedPost.content,
      excerpt: generatedPost.excerpt,
      date: generatedPost.date,
      cover_image: generatedPost.cover_image,
      author_name: generatedPost.author_name,
      updated_at: generatedPost.updated_at,
      image_caption: generatedPost.image_caption,
      published: true, // Set to false by default so you can review before publishing
    });

    if (insertError) {
      throw new Error(`Failed to insert blog post: ${insertError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "Blog post generated and saved successfully",
      post: generatedPost,
    });
  } catch (error: unknown) {
    console.error("Error generating blog post:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate blog post",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
