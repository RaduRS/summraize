import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { estimateCosts } from "@/utils/cost-calculator";
import fetch from "cross-fetch";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  throw new Error("DEEPGRAM_API_KEY is not configured");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
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

    // Convert the file to a buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer());

    // Send the buffer directly to Deepgram
    const deepgramParams = new URLSearchParams({
      model: "nova-2",
      smart_format: "true",
      punctuate: "true",
      paragraphs: "true",
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
          "Content-Type": audioFile.type || "audio/wav",
        },
        body: buffer,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Deepgram error:", error);
      return NextResponse.json(
        { error: "Failed to process audio" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.results?.channels[0]?.alternatives[0]?.transcript || "";
    const duration = Math.ceil(data.metadata?.duration || 0);
    const words = data.results?.channels[0]?.alternatives[0]?.words || [];

    // Calculate costs and check credits
    const costs = estimateCosts({ audioLength: duration });

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

    // Create a streaming response
    const creditsDeducted = credits.credits - (updatedCredits?.credits || 0);
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send words one by one with a small delay
          for (const word of words) {
            const wordData = {
              transcript: word.punctuated_word || word.word,
              words: [word],
              is_final: true,
              speech_final: word === words[words.length - 1], // Only true for last word
              creditsDeducted:
                word === words[words.length - 1] ? creditsDeducted : undefined, // Only send with last word
            };

            controller.enqueue(`data: ${JSON.stringify(wordData)}\n\n`);
            // Add a small delay between words to simulate real-time
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      },
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
