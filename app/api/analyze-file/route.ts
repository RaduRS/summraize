import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { calculateOperationCosts } from "@/utils/cost-calculator";
import pdf from "pdf-parse-fork";

export async function POST(request: Request) {
  try {
    const supabase = createClient(request);
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let wordCount = 0;
    let isEstimate = false;

    // Get actual word count for text files, estimate for others
    if (file.type === "text/plain") {
      const text = Buffer.from(await file.arrayBuffer()).toString("utf-8");
      wordCount = text.trim().split(/\s+/).length;
      isEstimate = true;
    } else if (file.type === "application/pdf") {
      try {
        // Try to get actual word count for PDFs
        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await pdf(buffer);
        wordCount = data.text.trim().split(/\s+/).length;
        isEstimate = true;
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
    const transcriptionCost = calculateOperationCosts(wordCount, "transcribe");
    const summarizationCost = calculateOperationCosts(wordCount, "summarize");
    const ttsCost = calculateOperationCosts(wordCount, "tts");

    // Return combined costs for different operations
    return NextResponse.json({
      wordCount,
      isEstimate,
      estimateRange,
      costs: {
        transcription: transcriptionCost,
        fullText: transcriptionCost + ttsCost, // Transcribe + TTS
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
