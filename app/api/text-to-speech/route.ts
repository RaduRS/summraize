import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { estimateCosts } from "@/utils/cost-calculator";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Increase max duration to handle longer texts
export const config = {
  runtime: "nodejs",
  maxDuration: 600, // 10 minutes
};

// Function to split text into chunks at sentence boundaries
function splitTextIntoChunks(text: string, maxChunkLength = 4000) {
  // Split text into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    // If adding this sentence would exceed the limit, save current chunk and start new one
    if (currentChunk.length + sentence.length > maxChunkLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  // Add the last chunk if it exists
  if (currentChunk) chunks.push(currentChunk.trim());

  return chunks;
}

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

    // Split text into chunks if it's too long
    const chunks = splitTextIntoChunks(cleanText);
    const audioBuffers: Buffer[] = [];

    // Process each chunk
    for (const chunk of chunks) {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: chunk,
        response_format: "mp3",
        speed: 1.0,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      audioBuffers.push(buffer);
    }

    // Combine all audio buffers
    const finalBuffer = Buffer.concat(audioBuffers);

    // Upload to Supabase Storage
    const fileName = `${user.id}/tts-${Date.now().toString()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("audio_recordings")
      .upload(fileName, finalBuffer, {
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
