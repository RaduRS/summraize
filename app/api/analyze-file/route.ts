import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { calculateOperationCosts, COST_RATES } from "@/utils/cost-calculator";
import pdf from "pdf-parse-fork";

export async function POST(request: Request) {
  try {
    const supabase = createClient(request);

    // Add auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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
      const fileSizeInMB = file.size / (1024 * 1024);

      if (file.type.startsWith("image/")) {
        if (file.type === "image/png") {
          // Increase PNG multiplier as they're uncompressed
          wordCount = Math.ceil(fileSizeInMB * 150);
        } else if (file.type === "image/jpeg") {
          // Increase JPEG multiplier as they're compressed
          wordCount = Math.ceil(fileSizeInMB * 300);
        } else {
          wordCount = Math.ceil(fileSizeInMB * 200);
        }
      } else {
        wordCount = Math.ceil(fileSizeInMB * 400);
      }

      // Adjust size-based modifications
      if (fileSizeInMB < 0.1) {
        // Increase multiplier for very small files
        wordCount = Math.ceil(wordCount * 0.8);
      } else if (fileSizeInMB > 5) {
        // Less aggressive reduction for large files
        wordCount = Math.ceil(wordCount * 0.8);
      }

      isEstimate = true;
      // For images and other files, estimate charCount based on wordCount
      charCount = wordCount * 5; // Rough estimate of 5 chars per word
    }

    // Adjust confidence range to be less aggressive
    const estimateRange = isEstimate
      ? {
          minWordCount: Math.ceil(wordCount * 0.75), // -25%
          maxWordCount: Math.ceil(wordCount * 1.35), // +35%
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
