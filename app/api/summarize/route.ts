import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { estimateCosts } from "@/utils/cost-calculator";
import { detectContentType } from "@/helpers/detectContentType";

export const runtime = "edge";
export const preferredRegion = "auto";
export const dynamic = "force-dynamic";

// Initialize Deepseek client
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL as string;

if (!DEEPSEEK_API_URL) {
  throw new Error("DEEPSEEK_API_URL is not configured");
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const contentType = detectContentType(text);
    const temperature = contentType === "creative" ? 0.7 : 0.5;

    const costs = estimateCosts({ textLength: text.length });

    // Check user credits
    const supabase = await createClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: credits } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (!credits || credits.credits < costs.total) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: Math.ceil(costs.total),
          available: Math.floor(credits?.credits || 0),
        },
        { status: 402 }
      );
    }

    // Call Deepseek API for summarization
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are an AI content transformation assistant designed to help users convert long-form content into clear, structured formats. Adapt your output to these rules:

### Universal Guidelines
1. **Length Adaptation**:
   - Short texts (<500 words): 5-7 sentence summary
   - Medium texts (500-1500 words): 2-3 paragraphs
   - Long texts (>1500 words): 5-7 paragraphs (350-600 words)

2. **Structure Requirements**:
   - First paragraph: Contextual introduction
   - Middle paragraphs: Full event sequence with cause/effect
   - Final paragraph: Clear takeaways/next steps

3. **Client-Sensitive Formatting**:
   - Wrap key terms, names, and concepts in *single asterisks*
   - Use ## at the start of a line for section headers (e.g. "## Introduction")
   - Preserve: 
     • Technical terms for healthcare/education 
     • Action items for professionals
     • Creative tone for content
   - Always maintain original chronology

4. **Special Handling**:
   For narrative/story content:
   - Keep minor plot points
   - Preserve character dialogue examples
   - Maintain emotional tone

**Critical Rules**:
- NEVER skip steps in process descriptions
- ALWAYS show relationships between events ("because", "leading to")
- For transcripts: Include speaker labels and key quotes
- For technical content: Start section headers with ## (e.g. "## Technical Overview")

Now transform this input while following these rules:`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: temperature,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate summary with Deepseek");
    }

    const completion = await response.json();
    let summary = completion.choices[0].message.content;

    // Format the summary text
    summary = summary
      // Normalize spaces but preserve line breaks
      .replace(/[^\S\n]+/g, " ")
      // Ensure proper spacing after punctuation
      .replace(/([.!?])\s*/g, "$1 ")
      // Remove excessive line breaks
      .replace(/\n{3,}/g, "\n\n")
      // Trim any leading/trailing whitespace
      .trim();

    // Update credits
    const { data: updatedCredits, error: updateError } = await supabase
      .from("user_credits")
      .update({ credits: credits.credits - costs.total })
      .eq("user_id", user.id)
      .select("credits")
      .single();

    if (updateError) {
      throw new Error("Failed to update credits");
    }

    // Calculate credits deducted
    const creditsDeducted = credits.credits - updatedCredits.credits;

    return NextResponse.json({
      summary: summary,
      creditsDeducted,
    });
  } catch (error: any) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      {
        error: "Failed to generate summary",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
