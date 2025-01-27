import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { estimateCosts } from "@/utils/cost-calculator";
import Replicate from "replicate";

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const config = {
  runtime: "nodejs",
  maxDuration: 300,
};

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
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

    // Generate speech using Kokoro
    const prediction = await replicate.predictions.create({
      version:
        "dfdf537ba482b029e0a761699e6f55e9162cfd159270bfe0e44857caa5f275a6",
      input: {
        text,
        speed: 1.1,
        voice: "af",
      },
    });

    // Calculate timeout based on text length (minimum 60s, maximum 300s)
    // Assuming processing takes ~1 second per 100 words
    const wordsCount = text.split(/\s+/).length;
    const dynamicTimeout = Math.min(300000, Math.max(60000, wordsCount * 10));

    // Wait for the prediction to complete
    let output = await replicate.predictions.get(prediction.id);
    const startTime = Date.now();

    while (
      output.status === "processing" &&
      Date.now() - startTime < dynamicTimeout
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      output = await replicate.predictions.get(prediction.id);
    }

    if (output.status !== "succeeded" || !output.output) {
      throw new Error(
        `Failed to generate speech: ${output.error || "Status: " + output.status}`
      );
    }

    const audioUrl = Array.isArray(output.output)
      ? output.output[0]
      : output.output;

    if (!audioUrl || typeof audioUrl !== "string") {
      throw new Error("Invalid audio URL from Replicate API");
    }

    // Upload to Supabase Storage
    const buffer = Buffer.from(
      await fetch(audioUrl).then((res) => res.arrayBuffer())
    );
    const fileName = `${user.id}/tts-${Date.now().toString()}.wav`;

    const { error: uploadError } = await supabase.storage
      .from("audio_recordings")
      .upload(fileName, buffer, {
        contentType: "audio/wav",
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

    // Update credits
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
