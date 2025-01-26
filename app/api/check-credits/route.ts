import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const { requiredCredits } = await request.json();

    // Get the current user
    const supabase = createClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user credits
    const { data: credits } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (!credits || credits.credits < requiredCredits) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: requiredCredits,
          available: credits?.credits || 0,
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      success: true,
      available: credits.credits,
    });
  } catch (error: any) {
    console.error("Error checking credits:", error);
    return NextResponse.json(
      {
        error: "Failed to check credits",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
