import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { estimateCosts } from "@/utils/cost-calculator";
import textToSpeech from "@google-cloud/text-to-speech";
import { google } from "@google-cloud/text-to-speech/build/protos/protos";

// Initialize Google Cloud TTS client
const client = new textToSpeech.TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Voice types and their quotas
const VOICE_TIERS = {
  JOURNEY: {
    name: "Journey",
    quota: 1_000_000,
    voiceParams: {
      languageCode: "en-US",
      name: "en-US-Journey-F", // Journey female voice
      ssmlGender: google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
    },
  },
  WAVENET: {
    name: "WaveNet",
    quota: 1_000_000,
    voiceParams: {
      languageCode: "en-US",
      name: "en-US-Wavenet-F", // WaveNet female voice
      ssmlGender: google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
    },
  },
  NEURAL2: {
    name: "Neural2",
    quota: 1_000_000,
    voiceParams: {
      languageCode: "en-US",
      name: "en-US-Neural2-F", // Neural2 female voice
      ssmlGender: google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
    },
  },
  STANDARD: {
    name: "Standard",
    quota: 4_000_000,
    voiceParams: {
      languageCode: "en-US",
      name: "en-US-Standard-F", // Standard female voice
      ssmlGender: google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
    },
  },
};

// Increase max duration to handle longer texts
export const config = {
  runtime: "nodejs",
  maxDuration: 600, // 10 minutes
};

// Function to preprocess text and handle long sentences
function preprocessText(text: string) {
  // First, clean the text
  let cleanText = text
    .replace(/\*(.*?)\*/g, "$1") // Remove asterisks
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();

  // Split into sentences, handling multiple punctuation marks
  const sentences = cleanText.split(/([.!?]+\s+)/);

  // Process each potential long sentence
  const processedSentences = sentences.map((sentence) => {
    const trimmed = sentence.trim();
    if (trimmed.length > 200 && !trimmed.match(/[.!?]$/)) {
      // Split long sentences at natural break points
      const parts = sentence.split(
        /([,;:]|\s+and\s+|\s+but\s+|\s+or\s+|\s+so\s+)/
      );
      return parts
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .join(". ");
    }
    return sentence;
  });

  // Join everything back together and ensure proper spacing
  return processedSentences
    .join(" ")
    .replace(/\s*([.!?])\s*/g, "$1 ") // Normalize punctuation spacing
    .replace(/\s+/g, " ") // Clean up any double spaces
    .trim();
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Calculate estimated cost
    const costs = estimateCosts({
      textLength: text.length,
    });

    // Get the current user
    const supabase = createClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user credits
    const { data: credits, error: creditsError } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (creditsError || !credits || credits.credits < costs.total) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: costs.total,
          available: credits?.credits || 0,
        },
        { status: 402 }
      );
    }

    // Replace the old text cleaning with the new preprocessing
    const processedText = preprocessText(text);

    // Get current quota usage from Supabase
    const { data: quotaData } = await supabase
      .from("google_tts_quota")
      .select("*")
      .single();

    // Determine which voice tier to use based on quota
    let selectedTier;
    if (!quotaData || quotaData.journey_chars < VOICE_TIERS.JOURNEY.quota) {
      selectedTier = VOICE_TIERS.JOURNEY;
    } else if (quotaData.wavenet_chars < VOICE_TIERS.WAVENET.quota) {
      selectedTier = VOICE_TIERS.WAVENET;
    } else if (quotaData.neural2_chars < VOICE_TIERS.NEURAL2.quota) {
      selectedTier = VOICE_TIERS.NEURAL2;
    } else {
      selectedTier = VOICE_TIERS.STANDARD;
    }

    // Generate speech using Google Cloud TTS
    const [response] = await client.synthesizeSpeech({
      input: { text: processedText },
      voice: selectedTier.voiceParams,
      audioConfig: { audioEncoding: "MP3" },
    });

    if (!response.audioContent) {
      throw new Error("Failed to generate audio content");
    }

    // Convert to buffer
    const buffer = Buffer.from(response.audioContent);

    // Upload to Supabase Storage
    const fileName = `${user.id}/tts-${Date.now().toString()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("audio_recordings")
      .upload(fileName, buffer, {
        contentType: "audio/mpeg",
      });

    if (uploadError) {
      throw new Error("Failed to upload audio");
    }

    // Create signed URL
    const { data: urlData } = await supabase.storage
      .from("audio_recordings")
      .createSignedUrl(fileName, 3600);

    if (!urlData?.signedUrl) {
      throw new Error("Failed to generate signed URL");
    }

    // Update quota usage in Supabase
    const charCount = processedText.length;
    const quotaUpdate = {
      [selectedTier.name === "Journey"
        ? "journey_chars"
        : selectedTier.name === "WaveNet"
          ? "wavenet_chars"
          : selectedTier.name === "Neural2"
            ? "neural2_chars"
            : "standard_chars"]:
        (quotaData?.[
          selectedTier.name === "Journey"
            ? "journey_chars"
            : selectedTier.name === "WaveNet"
              ? "wavenet_chars"
              : selectedTier.name === "Neural2"
                ? "neural2_chars"
                : "standard_chars"
        ] || 0) + charCount,
    };

    await supabase
      .from("google_tts_quota")
      .upsert({ id: quotaData?.id || 1, ...quotaUpdate });

    // Update credits
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

    return NextResponse.json({
      audioUrl: urlData.signedUrl,
      creditsDeducted,
      voiceTier: selectedTier.name,
    });
  } catch (error: any) {
    console.error("Error generating speech:", error);
    return NextResponse.json(
      {
        error: "Failed to generate speech",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
