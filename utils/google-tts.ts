import textToSpeech from "@google-cloud/text-to-speech";
import { google } from "@google-cloud/text-to-speech/build/protos/protos";

// Initialize Google Cloud TTS client
const client = new textToSpeech.TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Voice configurations for different tiers
const VOICE_CONFIGS = {
  journey: {
    languageCode: "en-US",
    name: "en-US-Journey-F",
    ssmlGender: google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
  },
  wavenet: {
    languageCode: "en-US",
    name: "en-US-Wavenet-F",
    ssmlGender: google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
  },
  neural2: {
    languageCode: "en-US",
    name: "en-US-Neural2-F",
    ssmlGender: google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
  },
  standard: {
    languageCode: "en-US",
    name: "en-US-Standard-F",
    ssmlGender: google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
  },
};

// Function to preprocess text and handle long sentences
function preprocessText(text: string) {
  // Clean the text
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

export async function getGoogleTTS(
  text: string,
  voiceId: string
): Promise<Buffer> {
  // Get voice configuration
  const voiceConfig = VOICE_CONFIGS[voiceId as keyof typeof VOICE_CONFIGS];
  if (!voiceConfig) {
    throw new Error(`Invalid voice ID: ${voiceId}`);
  }

  // Preprocess the text
  const processedText = preprocessText(text);

  // Generate speech
  const [response] = await client.synthesizeSpeech({
    input: { text: processedText },
    voice: voiceConfig,
    audioConfig: { audioEncoding: "MP3" },
  });

  if (!response.audioContent) {
    throw new Error("Failed to generate audio content");
  }

  return Buffer.from(response.audioContent);
}
