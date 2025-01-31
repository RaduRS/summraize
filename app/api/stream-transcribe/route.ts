import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { estimateCosts } from "@/utils/cost-calculator";
import fetch from "cross-fetch";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  throw new Error("DEEPGRAM_API_KEY is not configured");
}

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word: string;
}

interface StreamResponse {
  transcript: string;
  words: DeepgramWord[];
  is_final: boolean;
  speech_final: boolean;
  paragraph_final?: boolean;
  creditsDeducted?: number;
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const duration = formData.get("duration") as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Get the current user
    const supabase = await createClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Calculate and check credits early
    const costs = estimateCosts({ audioLength: parseFloat(duration) });
    const { data: credits } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (!credits || credits.credits < costs.transcription) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: costs.transcription,
          available: credits?.credits || 0,
        },
        { status: 402 }
      );
    }

    // Create a ReadableStream for the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Convert File to ArrayBuffer
          const buffer = await audioFile.arrayBuffer();

          // Configure Deepgram with Nova 2 model
          const deepgramParams = new URLSearchParams({
            model: "nova-2",
            smart_format: "true",
            punctuate: "true",
            diarize: "false",
            utterances: "false",
            numerals: "false",
            paragraphs: "true",
          });

          const response = await fetch(
            "https://api.deepgram.com/v1/listen?" + deepgramParams.toString(),
            {
              method: "POST",
              headers: {
                Authorization: `Token ${DEEPGRAM_API_KEY}`,
                "Content-Type": audioFile.type || "audio/webm",
              },
              body: buffer,
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Deepgram API error: ${errorText}`);
          }

          const data = await response.json();
          const words = data.results?.channels[0]?.alternatives[0]?.words || [];

          // Send words one by one with a small delay
          for (let i = 0; i < words.length; i++) {
            const word = words[i] as DeepgramWord;

            // Check if this word ends a paragraph by looking at punctuation
            const isParagraphEnd =
              word.punctuated_word?.endsWith(".") ||
              word.punctuated_word?.endsWith("!") ||
              word.punctuated_word?.endsWith("?");

            const wordData: StreamResponse = {
              transcript: word.punctuated_word || word.word,
              words: [word],
              is_final: true,
              speech_final: i === words.length - 1,
              paragraph_final: isParagraphEnd,
              creditsDeducted:
                i === words.length - 1 ? costs.transcription : undefined,
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(wordData)}\n\n`)
            );

            // Add a small delay between words to simulate real-time
            if (i !== words.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }

          // Update credits after successful transcription
          await supabase
            .from("user_credits")
            .update({ credits: credits.credits - costs.transcription })
            .eq("user_id", user.id);

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    // Return the stream response
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Stream transcribe error:", error);
    return NextResponse.json(
      { error: "Failed to process audio" },
      { status: 500 }
    );
  }
}
