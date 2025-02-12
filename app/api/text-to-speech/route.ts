import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkTotalTTSUsage, updateTotalTTSUsage } from "@/utils/voice-tiers";
import { getGoogleTTS } from "@/utils/google-tts";
import { estimateCosts } from "@/utils/cost-calculator";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Calculate estimated cost
    const costs = estimateCosts({
      textLength: text.length,
    });

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

    if (creditsError || !credits || credits.credits < costs.total) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: costs.total,
          available: credits?.credits || 0,
        },
        { status: 402 }
      );
    }

    // Check total TTS usage and get appropriate tier
    const { selectedTier, usage } = await checkTotalTTSUsage(request);

    try {
      console.log("Starting TTS generation for text length:", text.length);

      // Use Google TTS for all tiers
      const audioContent = await getGoogleTTS(text, selectedTier.voiceId);

      console.log("Audio generated successfully, uploading to storage...");

      // Upload to Supabase Storage
      const fileName = `${user.id}/tts-${Date.now().toString()}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from("audio_recordings")
        .upload(fileName, audioContent, {
          contentType: "audio/mpeg",
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload audio");
      }

      // Create signed URL
      const { data: urlData } = await supabase.storage
        .from("audio_recordings")
        .createSignedUrl(fileName, 3600); // URL valid for 1 hour

      if (!urlData?.signedUrl) {
        throw new Error("Failed to generate signed URL");
      }

      // Update total TTS usage
      await updateTotalTTSUsage(request, selectedTier.name, text.length);

      // Update user credits
      const { data: updatedCredits, error: updateError } = await supabase
        .from("user_credits")
        .update({ credits: credits.credits - costs.total })
        .eq("user_id", user.id)
        .select("credits")
        .single();

      if (updateError) {
        throw new Error("Failed to update credits");
      }

      // Calculate credits deducted
      const creditsDeducted = credits.credits - updatedCredits.credits;

      return NextResponse.json({
        audioUrl: urlData.signedUrl,
        voiceTier: selectedTier.name,
        creditsDeducted,
      });
    } catch (error) {
      console.error("TTS Error:", error);
      // Check if it's a timeout error
      if (
        error instanceof Error &&
        error.message.includes("deadline exceeded")
      ) {
        return NextResponse.json(
          { error: "TTS generation timed out. Please try with shorter text." },
          { status: 504 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Route Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate speech";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
