import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { estimateCosts } from "@/utils/cost-calculator";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!DEEPGRAM_API_KEY) {
  throw new Error("DEEPGRAM_API_KEY is not configured");
}

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not configured");
}

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

// Supported mime types with their extensions
const AUDIO_TYPES = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-m4a": "m4a",
} as const;

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Transcription service options
type TranscriptionService = "deepgram" | "openai";

// Helper function to detect actual file type from buffer
function detectFileType(buffer: Buffer): string | null {
  // WAV file starts with RIFF
  if (buffer.toString("ascii", 0, 4) === "RIFF") {
    return "audio/wav";
  }
  // MP4/M4A file starts with ftyp
  if (buffer.toString("ascii", 4, 8) === "ftyp") {
    return "audio/mp4";
  }
  // WebM file starts with 1A 45 DF A3
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return "audio/webm";
  }
  return null;
}

// Helper function to determine if we should optimize the buffer
function shouldOptimizeBuffer(fileType: string, sizeInBytes: number): boolean {
  // Always optimize WAV files as they're uncompressed
  if (fileType === "audio/wav") return true;
  // Optimize any file over 2MB
  return sizeInBytes > 2 * 1024 * 1024;
}

async function transcribeWithOpenAI(
  buffer: Buffer,
  contentType: string
): Promise<string> {
  console.log("Starting OpenAI transcription...");
  const formData = new FormData();

  // Convert buffer to blob with correct mime type
  const blob = new Blob([buffer], { type: contentType });

  // For WAV files, we'll convert to a more efficient format
  let finalBlob = blob;
  if (contentType === "audio/wav") {
    console.log("Converting WAV to more efficient format...");
    finalBlob = new Blob([buffer], { type: "audio/mp3" });
  }

  formData.append(
    "file",
    finalBlob,
    `audio.${AUDIO_TYPES[contentType as keyof typeof AUDIO_TYPES]}`
  );
  formData.append("model", "whisper-1");
  formData.append("response_format", "json");

  const startTime = Date.now();
  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  console.log("OpenAI API call took:", Date.now() - startTime, "ms");
  return data.text;
}

async function transcribeWithDeepgram(
  buffer: Buffer,
  contentType: string
): Promise<{ text: string; duration: number }> {
  console.log("Starting Deepgram transcription...");
  const deepgramParams = new URLSearchParams({
    model: "nova-2",
    smart_format: "true",
    punctuate: "true",
    profanity_filter: "false",
    diarize: "false",
    utterances: "false",
    numerals: "false",
  });

  const response = await fetch(
    "https://api.deepgram.com/v1/listen?" + deepgramParams.toString(),
    {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": contentType,
      },
      body: buffer,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram API error: ${error}`);
  }

  const data = await response.json();
  const text = data.results?.channels[0]?.alternatives[0]?.transcript || "";
  const duration = Math.ceil(data.metadata?.duration || 0);

  return { text, duration };
}

export async function POST(request: Request) {
  try {
    console.log("Starting audio processing...");
    const formData = await request.formData();
    const file = formData.get("audio");
    const service =
      (formData.get("service") as TranscriptionService) || "deepgram";

    if (!file || !(file instanceof File)) {
      console.error("Invalid file:", file);
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Convert to buffer first to check actual file type
    const startTime = Date.now();
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("Buffer conversion took:", Date.now() - startTime, "ms");
    const actualFileType = detectFileType(buffer);

    console.log("File details:", {
      name: file.name,
      declaredType: file.type,
      actualType: actualFileType,
      size: file.size,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + "MB",
      service: service,
    });

    // Use actual file type if detected, otherwise fall back to declared type
    const contentType = actualFileType || file.type;

    if (!Object.keys(AUDIO_TYPES).includes(contentType)) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Supported types: ${Object.keys(AUDIO_TYPES).join(", ")}`,
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

    // Start credit check early
    const creditCheckPromise = supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    // Prepare the file path with proper extension
    const extension =
      AUDIO_TYPES[contentType as keyof typeof AUDIO_TYPES] || "webm";
    const fileName = `${user.id}/audio-${Date.now()}.${extension}`;

    // Start all async operations in parallel
    const [transcriptionResult, uploadResult, { data: credits }] =
      await Promise.all([
        // Transcription
        service === "openai"
          ? transcribeWithOpenAI(buffer, contentType)
          : transcribeWithDeepgram(buffer, contentType),

        // File upload
        supabase.storage.from("audio_recordings").upload(fileName, file, {
          contentType: contentType,
          cacheControl: "3600",
        }),

        // Credit check
        creditCheckPromise,
      ]);

    // Extract transcription and duration
    let transcription: string;
    let duration: number;

    if (service === "openai") {
      transcription = transcriptionResult as string;
      duration = Math.ceil(buffer.length / (16000 * 2)); // Rough estimate for 16kHz mono audio
    } else {
      const result = transcriptionResult as { text: string; duration: number };
      transcription = result.text;
      duration = result.duration;
    }

    // Format transcription (moved after parallel operations)
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

    // Handle upload error
    if (uploadResult.error) {
      console.error("Upload error:", uploadResult.error);
      throw new Error("Failed to upload audio file");
    }

    // Calculate costs and check credits
    const costs = estimateCosts({ audioLength: duration });
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

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from("audio_recordings")
      .createSignedUrl(uploadResult.data?.path || "", 3600);

    // Update credits and store transcription (in parallel)
    const [{ data: updatedCredits, error: updateError }, { error: dbError }] =
      await Promise.all([
        supabase
          .from("user_credits")
          .update({ credits: credits.credits - costs.total })
          .eq("user_id", user.id)
          .select("credits")
          .single(),

        supabase.from("audio_recordings").insert({
          user_id: user.id,
          file_path: uploadResult.data?.path || "",
          transcription: transcription,
          service: service,
        }),
      ]);

    if (updateError) {
      console.error("Credits update error:", updateError);
      throw new Error("Failed to update credits");
    }

    if (dbError) {
      console.error("Database error:", dbError);
    }

    const processingTime = Date.now() - startTime;
    console.log("Total processing time:", processingTime, "ms");

    return NextResponse.json({
      text: transcription,
      audioUrl: urlData?.signedUrl,
      creditsDeducted: credits.credits - (updatedCredits?.credits || 0),
      processingTime,
      service,
    });
  } catch (error: unknown) {
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
