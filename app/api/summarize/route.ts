import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { estimateCosts } from "@/utils/cost-calculator";

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
            content: `You are a skilled summarizer who creates well-balanced summaries. Your goal is to condense the text while preserving important details. Create a summary that is:

- About 1/3 to 1/2 the length of the original text
- Structured in 2-3 clear paragraphs:
  - First paragraph introduces main themes and key points
  - Middle paragraph(s) cover essential details and developments
  - Final paragraph concludes with outcomes or significance
- Important concepts marked with *asterisks*
- Each paragraph should be substantive but focused
- Clear paragraph breaks (double newline) between sections

Remember: A good summary should be shorter than the original while maintaining enough detail to stand alone as a comprehensive overview.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0.7,
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
