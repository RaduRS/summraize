import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { calculateOperationCosts, COST_RATES } from "@/utils/cost-calculator";
import pdf from "pdf-parse-fork";

export async function POST(request: Request) {
  try {
    const supabase = await createClient(request);

    // Add auth check
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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let wordCount = 0;
    let isEstimate = false;
    let charCount = 0;

    // Get actual word count for text files, estimate for others
    if (file.type === "text/plain") {
      const text = Buffer.from(await file.arrayBuffer()).toString("utf-8");
      wordCount = text.trim().split(/\s+/).length;
      charCount = text.length; // Use the top-level charCount
      isEstimate = false;
    } else if (file.type === "application/pdf") {
      try {
        // Try to get actual word count for PDFs
        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await pdf(buffer);
        const text = data.text.trim();
        wordCount = text.split(/\s+/).length;
        charCount = text.length; // Use the top-level charCount
        isEstimate = false;
      } catch (error) {
        // Fallback to size-based estimation if PDF parsing fails
        const fileSizeInMB = file.size / (1024 * 1024);
        wordCount = Math.ceil(fileSizeInMB * 800);
        isEstimate = true;
      }
    } else {
      // For other file types, estimate based on file size
      const fileSizeInMB = file.size / (1024 * 1024);
      wordCount = Math.ceil(fileSizeInMB * 800); // Rough estimate of 800 words per MB
      isEstimate = true;
    }

    // Provide a range if it's an estimate
    const estimateRange = isEstimate
      ? {
          minWordCount: Math.floor(wordCount * 0.7), // -30%
          maxWordCount: Math.ceil(wordCount * 1.3), // +30%
        }
      : null;

    // Calculate costs based on maximum possible word count to be safe
    const costWordCount = estimateRange
      ? estimateRange.maxWordCount
      : wordCount;

    // Calculate costs for each operation
    const isPdfOrText =
      file.type === "application/pdf" || file.type === "text/plain";
    const isImage = file.type.startsWith("image/");

    // For PDFs and text files, charge flat fee plus additional operations
    const transcriptionCost = isImage
      ? calculateOperationCosts(costWordCount, "transcribe", true)
      : isPdfOrText
        ? COST_RATES.pdf_processing // Flat fee for PDF/TXT
        : calculateOperationCosts(costWordCount, "transcribe");

    // For summarization, pass the actual character count if available
    const summarizationCost = calculateOperationCosts(
      costWordCount,
      "summarize",
      false,
      charCount // Pass actual char count if available
    );

    // For TTS, pass the actual character count if available
    const ttsCost = calculateOperationCosts(
      costWordCount,
      "tts",
      false,
      charCount // Pass actual char count if available
    );

    // Return combined costs for different operations
    return NextResponse.json({
      wordCount,
      isEstimate,
      estimateRange,
      costs: {
        transcription: transcriptionCost,
        fullText: transcriptionCost + ttsCost, // PDF/OCR + TTS
        summary: transcriptionCost + summarizationCost + ttsCost, // All operations
      },
    });
  } catch (error) {
    console.error("File analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze file" },
      { status: 500 }
    );
  }
}
