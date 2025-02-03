// Types for state management
export interface VoiceAssistantState {
  audioBlob: Blob | null;
  transcription: string | null;
  summary: string | null;
  ttsAudioBlob: Blob | null;
  audioDuration: number;
  finalDuration: number;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
    punctuated_word: string;
  }>;
}

interface StoredState {
  audioBlob: string | null;
  ttsAudioBlob: string | null;
  transcription: string | null;
  summary: string | null;
  audioDuration: number;
  finalDuration: number;
  words: VoiceAssistantState["words"];
  timestamp: number;
}

const STATE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

// Helper to check if we're in a browser environment
const isBrowser = () => typeof window !== "undefined";

// Convert base64 to Blob
const base64ToBlob = (base64: string, type: string): Blob => {
  const base64Data = base64.split(",")[1];
  const binaryData = atob(base64Data);
  const arrayBuffer = new ArrayBuffer(binaryData.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type });
};

// Convert Blob to base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Save state to local storage
export const saveVoiceAssistantState = async (
  state: Partial<VoiceAssistantState>
) => {
  if (!isBrowser()) return;

  try {
    const existingStateStr = localStorage.getItem("voiceAssistantState");
    const existingState = existingStateStr ? JSON.parse(existingStateStr) : {};

    const storedState: Partial<StoredState> = {
      ...existingState, // Keep existing state
      transcription: state.transcription ?? existingState.transcription ?? null,
      summary: state.summary ?? existingState.summary ?? null,
      audioDuration: state.audioDuration ?? existingState.audioDuration ?? 0,
      finalDuration: state.finalDuration ?? existingState.finalDuration ?? 0,
      words: state.words ?? existingState.words ?? [],
      timestamp: Date.now(),
    };

    if (state.audioBlob instanceof Blob) {
      storedState.audioBlob = await blobToBase64(state.audioBlob);
    }

    if (state.ttsAudioBlob instanceof Blob) {
      storedState.ttsAudioBlob = await blobToBase64(state.ttsAudioBlob);
    }

    localStorage.setItem("voiceAssistantState", JSON.stringify(storedState));
  } catch (error) {
    console.error("Error saving voice assistant state:", error);
  }
};

// Load state from local storage
export const loadVoiceAssistantState = (): VoiceAssistantState | null => {
  if (!isBrowser()) return null;

  try {
    const savedState = localStorage.getItem("voiceAssistantState");
    if (!savedState) return null;

    const state = JSON.parse(savedState) as StoredState;

    // Check if state has expired
    if (Date.now() - state.timestamp > STATE_EXPIRY) {
      localStorage.removeItem("voiceAssistantState");
      return null;
    }

    const result: VoiceAssistantState = {
      audioBlob: null,
      ttsAudioBlob: null,
      transcription: state.transcription,
      summary: state.summary,
      audioDuration: state.audioDuration,
      finalDuration: state.finalDuration,
      words: state.words,
    };

    // Convert base64 strings back to blobs
    if (state.audioBlob) {
      try {
        result.audioBlob = base64ToBlob(state.audioBlob, "audio/wav");
      } catch (error) {
        console.error("Error converting audio blob:", error);
      }
    }

    if (state.ttsAudioBlob) {
      try {
        result.ttsAudioBlob = base64ToBlob(state.ttsAudioBlob, "audio/mp3");
      } catch (error) {
        console.error("Error converting TTS audio blob:", error);
      }
    }

    return result;
  } catch (error) {
    console.error("Error loading voice assistant state:", error);
    return null;
  }
};

// Clear state from local storage
export const clearVoiceAssistantState = () => {
  if (!isBrowser()) return;
  localStorage.removeItem("voiceAssistantState");
};
