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

    // Convert File to buffer for Deepgram
    console.log("Converting file to buffer...");
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("Buffer size:", buffer.length);

    // Upload the audio file to storage
    const fileName = `${user.id}/audio-${Date.now()}.${file.type.split("/")[1] || "webm"}`;
    const { error: audioUploadError } = await supabase.storage
      .from("audio_recordings")
      .upload(fileName, file);

    if (audioUploadError) {
      console.error("Audio upload error:", audioUploadError);
      throw new Error("Failed to upload audio");
    }

    // Get signed URL for the audio file
    const { data: audioUrlData, error: audioUrlError } = await supabase.storage
      .from("audio_recordings")
      .createSignedUrl(fileName, 3600); // URL valid for 1 hour

    if (audioUrlError || !audioUrlData?.signedUrl) {
      throw new Error("Failed to generate audio URL");
    }

    // Deepgram settings
    const deepgramOptions = new URLSearchParams({
      model: "nova-2",
      smart_format: "true",
      detect_language: "true",
      punctuate: "true",
      paragraphs: "true",
    });

    console.log("Calling Deepgram API...");
    // Call Deepgram API with optimized timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(
        `https://api.deepgram.com/v1/listen?${deepgramOptions.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            "Content-Type": file.type || "audio/webm",
          },
          body: buffer,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Deepgram API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Transcription failed: ${errorText}`);
      }

      console.log("Processing Deepgram response...");
      const data = await response.json();

      // Get the raw transcription and format it
      let transcription =
        data.results?.channels[0]?.alternatives[0]?.transcript || "";
      if (!transcription) {
        throw new Error("No transcription received");
      }

      // Format the text for better readability
      transcription = transcription
        // Add paragraph breaks at natural points
        .replace(
          /\. (However|But|So|Then|After|Before|When|While|In|On|At|The|One|It|This|That|These|Those|My|His|Her|Their|Our|Your|If|Although|Though|Unless|Since|Because|As|And)\s/g,
          ".\n\n$1 "
        )
        // Add paragraph break after introductions/greetings
        .replace(
          /(Hi,|Hello,|Hey,|Greetings,|Welcome,)([^.!?]+[.!?])/g,
          "$1$2\n\n"
        )
        // Add paragraph break for new speakers or dialogue
        .replace(/([.!?])\s*"([^"]+)"/g, '$1\n\n"$2"')
        .replace(
          /([.!?])\s*([A-Z][a-z]+\s+said|asked|replied|exclaimed)/g,
          "$1\n\n$2"
        )
        // Normalize other spaces
        .replace(/[^\S\n]+/g, " ")
        // Remove excessive line breaks
        .replace(/\n{3,}/g, "\n\n")
        // Trim any leading/trailing whitespace
        .trim();

      const duration = Math.ceil(data.metadata?.duration || 0);

      // Save the transcription file to storage
      const transcriptionFileName = `${user.id}/transcription-${Date.now()}.txt`;
      const { error: transcriptionUploadError } = await supabase.storage
        .from("audio_recordings")
        .upload(transcriptionFileName, transcription, {
          contentType: "text/plain",
        });

      if (transcriptionUploadError) {
        console.error("Transcription upload error:", transcriptionUploadError);
        // Don't throw here, as we still want to return the transcription even if storage fails
      }

      // Get signed URL for the transcription file if upload succeeded
      let transcriptionUrl = null;
      if (!transcriptionUploadError) {
        const { data: transcriptionUrlData } = await supabase.storage
          .from("audio_recordings")
          .createSignedUrl(transcriptionFileName, 3600);

        if (transcriptionUrlData?.signedUrl) {
          transcriptionUrl = transcriptionUrlData.signedUrl;
        }
      }

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

      // Update credits and store results
      const [{ data: updatedCredits }, { error: dbError }] = await Promise.all([
        supabase
          .from("user_credits")
          .update({ credits: credits.credits - costs.total })
          .eq("user_id", user.id)
          .select("credits")
          .single(),
        supabase.from("audio_recordings").insert({
          user_id: user.id,
          file_path: fileName,
          transcription: transcription,
        }),
      ]);

      if (dbError) {
        console.error("Database error:", dbError);
      }

      return NextResponse.json({
        text: transcription,
        audioUrl: audioUrlData.signedUrl,
        transcriptionUrl: transcriptionUrl,
        creditsDeducted: credits.credits - (updatedCredits?.credits || 0),
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          { error: "Transcription timed out" },
          { status: 504 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Process audio error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process audio" },
      { status: 500 }
    );
  }
}
