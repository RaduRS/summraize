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

// Supported mime types
const SUPPORTED_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Helper function to determine if we should optimize the buffer
function shouldOptimizeBuffer(fileType: string, sizeInBytes: number): boolean {
  // Always optimize WAV files as they're uncompressed
  if (fileType === "audio/wav") return true;
  // Optimize any file over 2MB
  return sizeInBytes > 2 * 1024 * 1024;
}

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

    // Validate file type and size
    console.log("File received:", {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + "MB",
    });

    if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Supported types: ${SUPPORTED_AUDIO_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

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

    // Convert File to buffer and log size at each step
    console.log("Converting file to buffer...");
    const startTime = Date.now();
    let buffer = Buffer.from(await file.arrayBuffer());
    console.log("Buffer conversion took:", Date.now() - startTime, "ms");
    console.log(
      "Initial buffer size:",
      (buffer.length / (1024 * 1024)).toFixed(2) + "MB"
    );

    // Determine content type for Deepgram
    let contentType = file.type;
    if (contentType === "audio/x-m4a") {
      contentType = "audio/mp4";
    }

    // Prepare the file path with proper extension
    const fileExtension =
      file.type === "audio/x-m4a" ? "m4a" : file.type.split("/")[1] || "webm";
    const fileName = `${user.id}/audio-${Date.now()}.${fileExtension}`;

    // Start both Deepgram processing and file upload in parallel
    console.log("Starting parallel processing...");
    const [transcriptionResponse, uploadResult] = await Promise.all([
      (async () => {
        console.log("Calling Deepgram API...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const response = await fetch(
            "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&detect_language=true&punctuate=true&paragraphs=true&channels=1",
            {
              method: "POST",
              headers: {
                Authorization: `Token ${DEEPGRAM_API_KEY}`,
                "Content-Type": contentType,
              },
              body: buffer,
              signal: controller.signal,
            }
          );
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      })(),
      // Upload the original file (not the optimized buffer)
      supabase.storage.from("audio_recordings").upload(fileName, file, {
        contentType: file.type,
        cacheControl: "3600",
      }),
    ]);

    if (uploadResult.error) {
      console.error("Upload error:", uploadResult.error);
      throw new Error("Failed to upload audio file");
    }

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error("Deepgram API error:", {
        status: transcriptionResponse.status,
        statusText: transcriptionResponse.statusText,
        error: errorText,
      });
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const processingTime = Date.now() - startTime;
    console.log("Total processing time:", processingTime, "ms");

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
