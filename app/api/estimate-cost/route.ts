import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { estimateCosts } from "@/utils/cost-calculator";

export async function POST(request: Request) {
  try {
    const { fileSize, fileType } = await request.json();

    // Get the current user
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

    // Check user credits
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

    // Estimate cost based on file size and type
    const fileSizeInMB = fileSize / (1024 * 1024);
    let estimatedCost = 0;

    if (fileType === "application/pdf" || fileType === "text/plain") {
      // For PDFs and text files, use flat rate
      estimatedCost = 5; // Base cost for PDF/text processing
    } else if (fileType.startsWith("image/")) {
      // For images, higher cost due to OCR
      estimatedCost = 10; // Base cost for image OCR
    } else if (fileType.startsWith("audio/")) {
      // For audio, estimate based on duration (rough estimate: 1MB ≈ 1 minute)
      estimatedCost = Math.ceil(fileSizeInMB) * 2; // 2 credits per minute
    } else {
      // Default case
      estimatedCost = Math.ceil(fileSizeInMB * 2);
    }

    // Add buffer for potential summary/speech generation
    const totalEstimatedCost = estimatedCost * 1.2; // 20% buffer

    if (credits.credits < totalEstimatedCost) {
      return NextResponse.json(
        {
          required: totalEstimatedCost,
          available: credits.credits,
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      estimatedCost: totalEstimatedCost,
      available: credits.credits,
    });
  } catch (error) {
    console.error("Cost estimation error:", error);
    return NextResponse.json(
      { error: "Failed to estimate cost" },
      { status: 500 }
    );
  }
}
