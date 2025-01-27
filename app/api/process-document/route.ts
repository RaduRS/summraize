import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";
import { estimateCosts } from "@/utils/cost-calculator";
import { extractTextFromPDF } from "@/utils/pdf";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const encoder = new TextEncoder();

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export const maxDuration = 300;
// export const dynamic = "force-dynamic";

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
              text: "Extract and return only the text from this image. Format it with proper paragraphs and spacing. Return just the text, no additional commentary.",
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
      max_tokens: 1000,
    } as any);

    if (!response.choices[0]?.message?.content) {
      throw new Error("No text extracted from image");
    }

    // Format the extracted text
    let text = response.choices[0].message.content;
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
      )
      // Normalize other spaces
      .replace(/[^\S\n]+/g, " ")
      // Remove excessive line breaks
      .replace(/\n{3,}/g, "\n\n")
      // Trim any leading/trailing whitespace
      .trim();

    return text;
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Failed to extract text from image");
  }
}

// Also add text formatting for PDF text
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
      // Normalize other spaces
      .replace(/[^\S\n]+/g, " ")
      // Remove excessive line breaks
      .replace(/\n{3,}/g, "\n\n")
      // Trim any leading/trailing whitespace
      .trim()
  );
}

// Mark as server-side route
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json({ status: "API route working" });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mode = formData.get("mode") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Auth check
    const supabase = createClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let text = "";

    if (file.type === "application/pdf") {
      try {
        console.log("Processing PDF file:", file.name);
        // Forward to dedicated PDF endpoint
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(new URL("/api/process-pdf", request.url), {
          method: "POST",
          body: formData,
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
    const cleanText = text
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between camelCase
      .replace(/[^\S\n]+/g, " ") // Normalize spaces but preserve line breaks
      .replace(/\n{3,}/g, "\n\n") // Ensure max two line breaks
      .trim();

    // When actually processing and charging
    const wordCount = cleanText.replace(/\s+/g, " ").trim().split(/\s+/).length;
    const actualCost = Math.ceil(
      estimateCosts({
        textLength: wordCount,
      }).total
    );

    // Check if user has enough credits for actual cost
    const { data: credits } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

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
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
