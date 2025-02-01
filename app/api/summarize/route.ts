import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { estimateCosts } from "@/utils/cost-calculator";

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
            content: `You are an AI summarization assistant designed to help a diverse range of users—including students, professionals, content creators, and healthcare teams—by transforming long-form content into clear, structured summaries.

### Summary Guidelines:
- **For shorter texts (less than 500 words):** Provide a **concise (5-7 sentence) summary**, preserving clarity and key details.
- **For medium-length texts (500-1500 words):** Summarize in **2-3 well-structured paragraphs**, covering the main points while keeping key themes intact.
- **For long texts (above 1500 words):** **The summary MUST be 5-7 paragraphs** to ensure all major events, details, and themes are well-represented. DO NOT compress long texts into a short summary.

### Structure:
1. **Opening Paragraph:** Introduce the topic, purpose, or central theme concisely.
2. **Middle Paragraphs (3-5):** Present the essential details, events, and discussions in **depth** while maintaining natural storytelling flow.
3. **Final Paragraph:** Provide **conclusions, takeaways, or broader implications**, ensuring completeness.

### Formatting & Style:
- **Important concepts, names, and keywords must be wrapped in *asterisks*.**
- **For long texts (1500+ words), the summary MUST be detailed (at least 5 paragraphs).**
- **DO NOT skip minor events—maintain the logical flow of the story.**
- **Use double newlines** between paragraphs for clarity.
- **Ensure readability and engagement**—avoid robotic or overly compressed summaries.

### Special Considerations:
- **For technical/medical content:** Ensure clarity while keeping key terminology.
- **For business/meeting summaries:** Focus on decisions, action items, and conclusions.
- **For creative/literary content:** Preserve tone, structure, and emotional depth.
- **For video transcripts:** Ensure smooth readability, highlighting key events and sections.

**IMPORTANT:**
- **For long narrative content (like stories, lectures, or transcripts), the summary must cover all key events without skipping important scenes.**  
- **Ensure smooth transitions between paragraphs so the summary feels natural and complete.**

Now, summarize the following text while following these guidelines:`,
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
