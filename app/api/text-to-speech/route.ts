import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";
import { estimateCosts } from "@/utils/cost-calculator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultQuery: { timeout_ms: "0" },
  defaultHeaders: { "app-name": "summraize" },
});

// Available OpenAI voices
export const VOICES = {
  alloy: "Alloy - Neutral and balanced",
  echo: "Echo - Warm and rounded",
  fable: "Fable - British and proper",
  onyx: "Onyx - Deep and authoritative",
  nova: "Nova - Energetic and bright",
  shimmer: "Shimmer - Clear and expressive",
} as const;

export type VoiceOption = keyof typeof VOICES;

export const config = {
  runtime: "nodejs",
  maxDuration: 300,
};

export async function POST(request: Request) {
  try {
    const { text, voice = "alloy" } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    if (!Object.keys(VOICES).includes(voice)) {
      return NextResponse.json({ error: "Invalid voice" }, { status: 400 });
    }

    // Calculate estimated cost
    const costs = estimateCosts({
      textLength: text.length,
    });

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

    // Deduct credits
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

    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Upload to Supabase Storage
    const fileName = `${user.id}/tts-${Date.now().toString()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("audio_recordings")
      .upload(fileName, buffer, {
        contentType: "audio/mpeg",
      });

    if (uploadError) {
      throw new Error("Failed to upload audio");
    }

    // Create signed URL
    const { data: urlData } = await supabase.storage
      .from("audio_recordings")
      .createSignedUrl(fileName, 3600);

    if (!urlData?.signedUrl) {
      throw new Error("Failed to generate signed URL");
    }

    return NextResponse.json({
      audioUrl: urlData.signedUrl,
      creditsDeducted,
    });
  } catch (error: any) {
    console.error("Error generating speech:", error);
    return NextResponse.json(
      {
        error: "Failed to generate speech",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
