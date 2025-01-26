import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";
import { File } from "@web-std/file";
import { estimateCosts } from "@/utils/cost-calculator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 300; // 5 minutes timeout
export const dynamic = "force-dynamic";

export const config = {
  runtime: "nodejs",
  maxDuration: 300,
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio");
    const duration = Number(formData.get("duration")) || 0; // Get duration from frontend

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Get the current user
    const supabase = createClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate cost based on actual audio duration
    const costs = estimateCosts({
      audioLength: duration, // Use actual duration in seconds
    });

    // Check user credits
    const { data: credits } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (!credits || credits.credits < costs.total) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: costs.total,
          available: credits?.credits || 0,
        },
        { status: 402 }
      );
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("audio_recordings")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload audio" },
        { status: 500 }
      );
    }

    // Get signed URL instead of public URL
    const { data } = await supabase.storage
      .from("audio_recordings")
      .createSignedUrl(fileName, 3600);

    if (!data?.signedUrl) {
      throw new Error("Failed to generate signed URL");
    }

    const signedUrl = data.signedUrl;

    // Convert File to audio file for OpenAI
    const buffer = Buffer.from(await file.arrayBuffer());
    const audioFile = new File([buffer], "audio.webm", { type: "audio/webm" });

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });

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

    // Store the results in the database
    const { error: dbError } = await supabase.from("audio_recordings").insert({
      user_id: user.id,
      file_path: fileName,
      transcription: transcription.text,
    });

    if (dbError) {
      console.error("Database error:", dbError);
    }

    // Return just what we need
    return NextResponse.json({
      text: transcription.text,
      audioUrl: signedUrl,
      creditsDeducted,
    });
  } catch (error: any) {
    console.error("Process audio error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process audio" },
      { status: 500 }
    );
  }
}
