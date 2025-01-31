import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";
import { estimateCosts } from "@/utils/cost-calculator";

export const runtime = "edge";
export const preferredRegion = "auto";
export const dynamic = "force-dynamic";
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ApiSuccessResponse {
  text: string;
  wordCount: number;
  creditsDeducted: number;
}

interface ApiErrorResponse {
  error: string;
  required?: number;
  available?: number;
}

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const base64Image = buffer.toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the text from this image, preserving the original formatting as much as possible. Pay attention to:\n- Paragraph breaks and indentation\n- Section headers and titles\n- Lists and bullet points\n- Text alignment (if it's centered, right-aligned, etc.)\n- Special formatting like italics or bold (mark with *asterisks*)\n- Column layouts\n- Any other visual structure from the original.\nIf the formatting isn't clear or seems standard, fall back to natural paragraph breaks.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error("No text extracted from image");
    }

    // Get the formatted text from GPT-4 Vision
    let text = response.choices[0].message.content;

    // If the text doesn't seem to have any special formatting,
    // apply our standard formatting as fallback
    if (!text.includes("\n") && !text.includes("*")) {
      text = text
        // Add paragraph breaks at natural points
        .replace(
          /\. (However|But|So|Then|After|Before|When|While|In|On|At|The|One|It|This|That|These|Those|My|His|Her|Their|Our|Your|If|Although|Though|Unless|Since|Because|As|And)\s/g,
          ".\n\n$1 "
        )
        // Add paragraph break after introductions/greetings
        .replace(
          /(Hi,|Hello,|Hey,|Greetings,|Welcome,)([^.!?]+[.!?])/g,
          "$1$2\n\n"
        )
        // Add paragraph break for new speakers or dialogue
        .replace(/([.!?])\s*"([^"]+)"/g, '$1\n\n"$2"')
        .replace(
          /([.!?])\s*([A-Z][a-z]+\s+said|asked|replied|exclaimed)/g,
          "$1\n\n$2"
        );
    }

    // Clean up any excessive spacing while preserving intentional line breaks
    text = text
      .replace(/[^\S\n]+/g, " ") // Normalize spaces but preserve line breaks
      .replace(/\n{3,}/g, "\n\n") // Ensure max two line breaks
      .trim();

    return text;
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Failed to extract text from image");
  }
}

function formatExtractedText(text: string): string {
  return (
    text
      // Add paragraph breaks at natural points
      .replace(
        /\. (However|But|So|Then|After|Before|When|While|In|On|At|The|One|It|This|That|These|Those|My|His|Her|Their|Our|Your|If|Although|Though|Unless|Since|Because|As|And)\s/g,
        ".\n\n$1 "
      )
      // Add paragraph break after introductions/greetings
      .replace(
        /(Hi,|Hello,|Hey,|Greetings,|Welcome,)([^.!?]+[.!?])/g,
        "$1$2\n\n"
      )
      // Add paragraph break for new speakers or dialogue
      .replace(/([.!?])\s*"([^"]+)"/g, '$1\n\n"$2"')
      .replace(
        /([.!?])\s*([A-Z][a-z]+\s+said|asked|replied|exclaimed)/g,
        "$1\n\n$2"
      )
      // Normalize spaces but preserve line breaks
      .replace(/[^\S\n]+/g, " ")
      // Ensure max two line breaks
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mode = formData.get("mode") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Auth check
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

    let text = "";

    if (file.type === "application/pdf") {
      try {
        console.log("Processing PDF file:", file.name);
        // Forward to dedicated PDF endpoint with auth cookie
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(new URL("/api/process-pdf", request.url), {
          method: "POST",
          body: formData,
          headers: {
            cookie: request.headers.get("cookie") || "",
          },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to process PDF");
        }
        text = formatExtractedText(data.text);
        console.log("PDF text extracted and formatted, length:", text.length);
      } catch (error) {
        console.error("PDF processing error:", error);
        throw new Error("Failed to process PDF document");
      }
    } else if (file.type.startsWith("image/")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      text = await extractTextFromImage(buffer);
    } else if (file.type === "text/plain") {
      text = formatExtractedText(await file.text());
    } else {
      text = formatExtractedText(await file.text());
    }

    // Clean up the text formatting but preserve paragraphs
    let cleanText = text
      // Remove leading/trailing quotes
      .replace(/^['"`]+|['"`]+$/g, "")
      // Add space between camelCase
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      // Normalize spaces but preserve line breaks
      .replace(/[^\S\n]+/g, " ")
      // Ensure max two line breaks
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // If mode is summary, generate summary first
    if (mode === "summary") {
      try {
        const summaryResponse = await fetch(
          new URL("/api/summarize", request.url),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: cleanText }),
          }
        );

        const summaryData = await summaryResponse.json();
        if (!summaryResponse.ok) {
          if (summaryResponse.status === 402) {
            return NextResponse.json(
              {
                error: "Insufficient credits",
                required: summaryData.required,
                available: summaryData.available,
              },
              { status: 402 }
            );
          }
          throw new Error(summaryData.error || "Failed to generate summary");
        }

        cleanText = summaryData.summary;
      } catch (error: any) {
        console.error("Summary generation error:", error);
        throw new Error("Failed to generate summary");
      }
    }

    // Calculate word count and cost
    const wordCount = cleanText.replace(/\s+/g, " ").trim().split(/\s+/).length;
    const charCount = cleanText.length;
    const isPdfOrText =
      file.type === "application/pdf" || file.type === "text/plain";

    const actualCost = Math.ceil(
      estimateCosts({
        textLength: charCount,
        isImageOcr: file.type.startsWith("image/"),
        isPdfOrText: isPdfOrText,
        summaryLength: mode === "summary" ? charCount : undefined,
      }).total
    );

    // Check if user has enough credits
    const { data: credits, error: creditsError } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (creditsError) {
      console.error("Credits error:", creditsError);
      return NextResponse.json(
        { error: "Failed to check credits" },
        { status: 500 }
      );
    }

    if (!credits) {
      return NextResponse.json(
        { error: "No credits found for user" },
        { status: 404 }
      );
    }

    if (credits.credits < actualCost) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: actualCost,
          available: credits.credits,
        },
        { status: 402 }
      );
    }

    // Update credits
    const { data: updatedCredits, error: updateError } = await supabase
      .from("user_credits")
      .update({ credits: credits.credits - actualCost })
      .eq("user_id", user.id)
      .select("credits")
      .single();

    if (updateError) {
      console.error("Credits update error:", updateError);
      throw new Error("Failed to update credits");
    }

    // Calculate credits deducted
    const creditsDeducted = credits.credits - updatedCredits.credits;

    return NextResponse.json({
      text: cleanText,
      wordCount,
      creditsDeducted,
    });
  } catch (error: any) {
    console.error("Document processing error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to process document",
      },
      { status: 500 }
    );
  }
}
