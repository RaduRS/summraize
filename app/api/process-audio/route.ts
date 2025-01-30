import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { estimateCosts } from "@/utils/cost-calculator";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  throw new Error("DEEPGRAM_API_KEY is not configured");
}

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

export async function POST(request: Request) {
  try {
    console.log("Starting audio processing...");
    const formData = await request.formData();
    const file = formData.get("audio");

    if (!file || !(file instanceof File)) {
      console.error("Invalid file:", file);
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Log file details
    console.log("File received:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Get the current user with proper cookie handling
    const supabase = await createClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 401 }
      );
    }

    // Convert File to buffer once and reuse
    console.log("Converting file to buffer...");
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("Buffer size:", buffer.length);

    // Start Deepgram processing immediately
    console.log("Calling Deepgram API...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Start both Deepgram processing and file upload in parallel
    const [transcriptionResponse, uploadResult] = await Promise.all([
      fetch(
        "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&detect_language=true&punctuate=true&paragraphs=true",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            "Content-Type": file.type || "audio/webm",
          },
          body: buffer,
          signal: controller.signal,
        }
      ),
      // Upload file and get the path
      supabase.storage
        .from("audio_recordings")
        .upload(
          `${user.id}/audio-${Date.now()}.${file.type.split("/")[1] || "webm"}`,
          file
        ),
    ]);

    if (uploadResult.error) {
      console.error("Upload error:", uploadResult.error);
      throw new Error("Failed to upload audio file");
    }

    clearTimeout(timeoutId);

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error("Deepgram API error:", {
        status: transcriptionResponse.status,
        statusText: transcriptionResponse.statusText,
        error: errorText,
      });
      throw new Error(`Transcription failed: ${errorText}`);
    }

    console.log("Processing Deepgram response...");
    const data = await transcriptionResponse.json();

    // Get and format transcription
    let transcription =
      data.results?.channels[0]?.alternatives[0]?.transcript || "";
    if (!transcription) {
      throw new Error("No transcription received");
    }

    // Format the text for better readability
    transcription = transcription
      .replace(
        /\. (However|But|So|Then|After|Before|When|While|In|On|At|The|One|It|This|That|These|Those|My|His|Her|Their|Our|Your|If|Although|Though|Unless|Since|Because|As|And)\s/g,
        ".\n\n$1 "
      )
      .replace(
        /(Hi,|Hello,|Hey,|Greetings,|Welcome,)([^.!?]+[.!?])/g,
        "$1$2\n\n"
      )
      .replace(/([.!?])\s*"([^"]+)"/g, '$1\n\n"$2"')
      .replace(
        /([.!?])\s*([A-Z][a-z]+\s+said|asked|replied|exclaimed)/g,
        "$1\n\n$2"
      )
      .replace(/[^\S\n]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const duration = Math.ceil(data.metadata?.duration || 0);

    // Calculate and check credits
    const costs = estimateCosts({ audioLength: duration });
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

    // Get signed URL for the audio file
    const { data: urlData } = await supabase.storage
      .from("audio_recordings")
      .createSignedUrl(uploadResult.data?.path || "", 3600);

    // Update credits and store transcription
    const { data: updatedCredits, error: updateError } = await supabase
      .from("user_credits")
      .update({ credits: credits.credits - costs.total })
      .eq("user_id", user.id)
      .select("credits")
      .single();

    if (updateError) {
      console.error("Credits update error:", updateError);
      throw new Error("Failed to update credits");
    }

    // Store transcription in database
    const { error: dbError } = await supabase.from("audio_recordings").insert({
      user_id: user.id,
      file_path: uploadResult.data?.path || "",
      transcription: transcription,
    });

    if (dbError) {
      console.error("Database error:", dbError);
    }

    return NextResponse.json({
      text: transcription,
      audioUrl: urlData?.signedUrl,
      creditsDeducted: credits.credits - (updatedCredits?.credits || 0),
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Transcription timed out" },
        { status: 504 }
      );
    }
    console.error("Process audio error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process audio",
      },
      { status: 500 }
    );
  }
}
