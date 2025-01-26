import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { estimateCosts } from "@/utils/cost-calculator";

export async function POST(request: Request) {
  try {
    const supabase = createClient(request);
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Get user's current credits
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: credits } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (!credits) {
      return NextResponse.json({ error: "No credits found" }, { status: 404 });
    }

    // Read file content for estimation
    const buffer = Buffer.from(await file.arrayBuffer());

    // Estimate costs based on file type
    let estimatedCost = 0;

    if (file.type === "text/plain") {
      // For text files, read content directly
      const text = buffer.toString("utf-8");
      estimatedCost = Math.ceil(
        estimateCosts({
          textLength: text.length,
        }).total
      );
    } else if (file.type === "application/pdf") {
      // For PDFs, estimate based on file size with a multiplier
      // This is a rough estimate - you might want to use a PDF parser
      estimatedCost = Math.ceil(
        estimateCosts({
          textLength: Math.ceil(buffer.length * 0.1), // Rough estimate: 10% of file size is text
        }).total
      );
    } else if (file.type.startsWith("image/")) {
      // For images, use a base cost as OCR processing is more intensive
      estimatedCost = Math.ceil(
        estimateCosts({
          textLength: 1000, // Base estimate for image OCR
        }).total
      );
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
