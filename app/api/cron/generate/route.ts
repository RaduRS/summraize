import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";

export const runtime = "edge";
export const preferredRegion = "auto";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Set maximum duration to 5 minutes

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add detailed logging
function log(message: string, data?: any) {
  console.log(`[Blog Generator] ${message}`, data ? JSON.stringify(data) : "");
}

const BLOG_PROMPT = `Create a concise blog post about AI or productivity tools. Format:

{
  "title": "Brief, engaging title",
  "slug": "url-friendly-version-of-title",
  "content": "## Introduction\\n[2-3 sentences intro]\\n\\n## Main Points\\n- Point 1\\n- Point 2\\n- Point 3\\n\\n## Conclusion\\n[1-2 sentences wrap-up]",
  "excerpt": "One sentence summary",
  "date": "${new Date().toISOString()}",
  "author_name": "Radu R",
  "cover_image": null,
  "image_caption": null
}

Keep content focused and under 1000 words. Use markdown formatting.`;

export async function GET(request: Request) {
  try {
    log("Starting blog post generation");

    const supabase = await createClient();
    log("Supabase client created");

    // Generate blog post using OpenAI
    log("Calling OpenAI API");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional blog post generator. You create high-quality, engaging content. Create focused content in valid JSON format.",
        },
        {
          role: "user",
          content: BLOG_PROMPT,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048, // Reduced from 4096
      response_format: { type: "json_object" },
    });

    if (!completion.choices[0]?.message?.content) {
      log("Missing content in OpenAI response");
      throw new Error("Missing content in OpenAI response");
    }

    log("Successfully received response from OpenAI");
    const generatedPost = JSON.parse(completion.choices[0].message.content);

    // Validate the generated post structure
    const requiredFields = ["title", "slug", "content", "date"];
    for (const field of requiredFields) {
      if (!generatedPost[field]) {
        log(`Missing required field in generated post: ${field}`);
        throw new Error(`Generated post is missing required field: ${field}`);
      }
    }

    log("Generated post validation successful", {
      title: generatedPost.title,
      slug: generatedPost.slug,
    });

    // Insert the post into the database
    log("Inserting post into database");
    const { error: insertError } = await supabase.from("blog_posts").insert({
      title: generatedPost.title,
      slug: generatedPost.slug,
      content: generatedPost.content,
      excerpt: generatedPost.excerpt,
      date: generatedPost.date,
      cover_image: generatedPost.cover_image,
      author_name: generatedPost.author_name,
      image_caption: generatedPost.image_caption,
      published: true,
    });

    if (insertError) {
      log("Database insertion error", insertError);
      throw new Error(`Failed to insert blog post: ${insertError.message}`);
    }

    log("Blog post successfully generated and saved", {
      title: generatedPost.title,
      slug: generatedPost.slug,
    });

    return NextResponse.json({
      success: true,
      message: "Blog post generated and saved successfully",
      post: generatedPost,
    });
  } catch (error: unknown) {
    log("Error in blog post generation", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

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
