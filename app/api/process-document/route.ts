import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";
import * as pdfjsLib from "pdfjs-dist";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const encoder = new TextEncoder();

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export const maxDuration = 300;
// export const dynamic = "force-dynamic";

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Set up the worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = "";

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      text += strings.join(" ") + "\n";
    }

    return text;
  } catch (error) {
    console.error("PDF Error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

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
              text: "Extract and return only the text from this image. Return just the text, no additional commentary.",
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

    return response.choices[0].message.content;
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Failed to extract text from image");
  }
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
    const file = formData.get("file") as File | null;
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

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    if (file.type === "application/pdf") {
      extractedText = await extractTextFromPDF(buffer);
    } else if (file.type.startsWith("image/")) {
      extractedText = await extractTextFromImage(buffer);
    } else if (file.type === "text/plain") {
      extractedText = buffer.toString("utf-8");
    }

    // Clean up the text formatting
    const cleanText = extractedText
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between camelCase
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();

    return NextResponse.json({ text: cleanText });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
