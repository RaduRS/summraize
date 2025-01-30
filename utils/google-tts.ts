import textToSpeech from "@google-cloud/text-to-speech";
import { google } from "@google-cloud/text-to-speech/build/protos/protos";

// Function to decode and parse credentials
function getCredentials() {
  const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
  if (!credentialsBase64) {
    throw new Error(
      "GOOGLE_CREDENTIALS_BASE64 environment variable is not set"
    );
  }

  try {
    // Decode base64 and parse as JSON
    const credentialsJson = Buffer.from(credentialsBase64, "base64").toString();
    const credentials = JSON.parse(credentialsJson);

    // Validate the credentials object
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("Invalid credentials format: missing required fields");
    }

    return credentials;
  } catch (error) {
    console.error("Error parsing Google credentials:", error);
    throw new Error("Invalid GOOGLE_CREDENTIALS_BASE64 format");
  }
}

// Initialize Google Cloud TTS client with proper error handling
let client: InstanceType<typeof textToSpeech.TextToSpeechClient>;
try {
  client = new textToSpeech.TextToSpeechClient({
    credentials: getCredentials(),
  });
} catch (error) {
  console.error("Failed to initialize Google TTS client:", error);
  throw error;
}

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
    if (trimmed.length > 200) {
      // Break long sentences at natural points
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
  try {
    // Get voice configuration
    const voiceConfig = VOICE_CONFIGS[voiceId as keyof typeof VOICE_CONFIGS];
    if (!voiceConfig) {
      throw new Error(`Invalid voice ID: ${voiceId}`);
    }

    // Preprocess the text
    const processedText = preprocessText(text);

    // Create the synthesis input
    const request = {
      input: { text: processedText },
      voice: voiceConfig,
      audioConfig: { audioEncoding: "MP3" as const },
    };

    // Perform the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);
    if (!response.audioContent) {
      throw new Error("No audio content received from Google TTS");
    }

    return Buffer.from(response.audioContent);
  } catch (error) {
    console.error("Google TTS error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to generate speech"
    );
  }
}
