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

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Converting file to buffer...");
    // Convert File to buffer for Deepgram
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("Buffer size:", buffer.length);

    console.log("Calling Deepgram API...");
    // Call Deepgram API
    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&detect_language=true&punctuate=true&paragraphs=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": file.type || "audio/webm",
        },
        body: buffer,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Deepgram API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to transcribe audio with Deepgram: ${errorText}`);
    }

    console.log("Processing Deepgram response...");
    const data = await response.json();

    // Get the raw transcription
    let transcription =
      data.results?.channels[0]?.alternatives[0]?.transcript || "";

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

    // Calculate cost based on audio duration
    const costs = estimateCosts({
      audioLength: duration,
    });

    // Check user credits
    const { data: credits, error: creditsError } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (creditsError) {
      console.error("Credits error:", creditsError);
      return NextResponse.json(
        { error: "Failed to check credits" },
        { status: 500 }
      );
    }

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

    // Get signed URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from("audio_recordings")
      .createSignedUrl(fileName, 3600);

    if (urlError || !urlData?.signedUrl) {
      console.error("URL generation error:", urlError);
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
      console.error("Credits update error:", updateError);
      throw new Error("Failed to update credits");
    }

    // Calculate credits deducted
    const creditsDeducted = credits.credits - updatedCredits.credits;

    // Store the results in the database
    const { error: dbError } = await supabase.from("audio_recordings").insert({
      user_id: user.id,
      file_path: fileName,
      transcription: transcription,
    });

    if (dbError) {
      console.error("Database error:", dbError);
    }

    return NextResponse.json({
      text: transcription,
      audioUrl: urlData.signedUrl,
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
