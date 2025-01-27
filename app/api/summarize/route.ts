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
    const supabase = createClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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
            content: `You are a skilled summarizer who creates natural, conversational summaries. Adapt your summary length based on the input: be brief for short texts, more detailed for longer ones, but always maintain a natural flow. Focus on the essential information and present it as if you're explaining it to someone, without using bullet points, asterisks, or section markers. The summary should read like a cohesive narrative that a human would speak naturally.`,
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
      summary: completion.choices[0].message.content,
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
