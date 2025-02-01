import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { estimateCosts } from "@/utils/cost-calculator";
import fetch from "cross-fetch";

export const runtime = "edge";
export const preferredRegion = "auto";
export const dynamic = "force-dynamic";

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
    const durationStr = formData.get("duration");
    const duration = durationStr ? parseFloat(String(durationStr)) : 0;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Get the current user using edge-compatible Supabase client
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
    const costs = estimateCosts({ audioLength: duration });
    const { data: credits, error: creditsError } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (creditsError) {
      return NextResponse.json(
        { error: "Failed to check credits" },
        { status: 500 }
      );
    }

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
          // Get original audio buffer
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
                "Content-Type": "audio/wav",
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

          // Calculate delay based on duration (in milliseconds)
          const wordDelay: number = duration > 60 ? 20 : 100; // 20ms for long audio, 100ms for short

          // Process words in batches for long audio, individually for short audio
          if (duration > 60) {
            // Process in batches of 5 for long audio
            for (let i = 0; i < words.length; i += 5) {
              const batch = words.slice(i, i + 5);
              const isLastBatch = i + 5 >= words.length;

              // Check if the last word in batch ends a paragraph
              const lastWord = batch[batch.length - 1] as DeepgramWord;
              const isParagraphEnd =
                lastWord.punctuated_word?.endsWith(".") ||
                lastWord.punctuated_word?.endsWith("!") ||
                lastWord.punctuated_word?.endsWith("?");

              const batchData: StreamResponse = {
                transcript: batch
                  .map((w: DeepgramWord) => w.punctuated_word || w.word)
                  .join(" "),
                words: batch,
                is_final: true,
                speech_final: isLastBatch,
                paragraph_final: isParagraphEnd,
                creditsDeducted: isLastBatch ? costs.transcription : undefined,
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(batchData)}\n\n`)
              );

              if (!isLastBatch) {
                await new Promise((resolve) => setTimeout(resolve, wordDelay));
              }
            }
          } else {
            // Process words one by one for short audio
            for (let i = 0; i < words.length; i++) {
              const word = words[i] as DeepgramWord;
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

              if (i !== words.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, wordDelay));
              }
            }
          }

          // Update credits after successful transcription
          const { error: updateError } = await supabase
            .from("user_credits")
            .update({ credits: credits.credits - costs.transcription })
            .eq("user_id", user.id);

          if (updateError) {
            console.error("Failed to update credits:", updateError);
          }

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
