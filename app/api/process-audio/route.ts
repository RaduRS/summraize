import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";
import { File } from "@web-std/file";

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
      audioUrl: URL.createObjectURL(file), // Use local URL for immediate playback
    });
  } catch (error: any) {
    console.error("Process audio error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process audio" },
      { status: 500 }
    );
  }
}
