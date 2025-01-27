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

    // Clean text for speech - remove formatting markers and normalize spacing
    const cleanText = text
      .replace(/\*(.*?)\*/g, "$1") // Remove asterisks
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();

    // Split long text into chunks of max 500 characters
    const chunks = cleanText.match(/.{1,500}(?=\s|$)/g) || [cleanText];

    // Process each chunk in parallel
    const predictions = await Promise.all(
      chunks.map((chunk: string) =>
        replicate.predictions.create({
          version:
            "dfdf537ba482b029e0a761699e6f55e9162cfd159270bfe0e44857caa5f275a6",
          input: {
            text: chunk,
            speed: 1.1,
            voice: "af",
          },
        })
      )
    );

    // Initial delay to allow models to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Wait for all predictions with timeouts
    const START_TIMEOUT = 15000; // 15 seconds to start
    const PROCESS_TIMEOUT = 30000; // 30 seconds per chunk
    const startTime = Date.now();

    const outputs = await Promise.all(
      predictions.map(async (prediction) => {
        let output = await replicate.predictions.get(prediction.id);

        // Wait for job to start
        while (
          output.status === "starting" &&
          Date.now() - startTime < START_TIMEOUT
        ) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          output = await replicate.predictions.get(prediction.id);
        }

        if (output.status === "starting") {
          try {
            await fetch(output.urls.cancel, {
              method: "POST",
              headers: {
                Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
              },
            });
          } catch (cancelError) {
            console.error("Error canceling prediction:", cancelError);
          }
          throw new Error("Speech generation took too long to start");
        }

        // Wait for processing with timeout
        const processStartTime = Date.now();
        let retryDelay = 1000;

        while (
          ["processing"].includes(output.status) &&
          Date.now() - processStartTime < PROCESS_TIMEOUT
        ) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          output = await replicate.predictions.get(prediction.id);
          retryDelay = Math.min(retryDelay * 1.5, 3000); // Cap at 3s instead of 5s
        }

        if (!output.output || output.status !== "succeeded") {
          throw new Error(
            `Failed to generate speech for chunk. Status: ${output.status}`
          );
        }

        return Array.isArray(output.output) ? output.output[0] : output.output;
      })
    );

    // Combine audio files if multiple chunks
    let finalBuffer: Buffer;
    if (outputs.length === 1) {
      finalBuffer = Buffer.from(
        await fetch(outputs[0]).then((res) => res.arrayBuffer())
      );
    } else {
      // TODO: Implement audio concatenation for multiple chunks
      // For now, just use the first chunk
      finalBuffer = Buffer.from(
        await fetch(outputs[0]).then((res) => res.arrayBuffer())
      );
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/tts-${Date.now().toString()}.wav`;
    const { error: uploadError } = await supabase.storage
      .from("audio_recordings")
      .upload(fileName, finalBuffer, {
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
