import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ApiSuccessResponse {
  text: string;
  wordCount: number;
}

interface ApiErrorResponse {
  error: string;
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

    const text = response.choices[0].message.content || "";
    return formatExtractedText(text);
  } catch (error) {
    console.error("Error in OCR:", error);
    throw new Error("Failed to extract text from image");
  }
}

// Text formatting helper
function formatExtractedText(text: string): string {
  return (
    text
      // Remove leading/trailing quotes
      .replace(/^['"`]+|['"`]+$/g, "")
      // Add space between camelCase
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      // Normalize spaces but preserve line breaks
      .replace(/[^\S\n]+/g, " ")
      // Ensure max two line breaks
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// Mark as server-side route
export const dynamic = "force-dynamic";

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const cleanText = await extractTextFromImage(buffer);

    return NextResponse.json({
      text: cleanText,
      wordCount: cleanText.split(/\s+/).length,
    });
  } catch (error: any) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
