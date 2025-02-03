// Types for state management
export interface DocumentConverterState {
  documentBlob: Blob | null;
  fileName: string | null;
  fullText: string | null;
  summary: string | null;
  fullTextAudioBlob: Blob | null;
  summaryAudioBlob: Blob | null;
}

interface StoredState {
  documentBlob: string | null; // Base64 encoded document
  fileName: string | null;
  fullText: string | null;
  summary: string | null;
  fullTextAudioBlob: string | null; // Base64 encoded audio
  summaryAudioBlob: string | null; // Base64 encoded audio
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
export const saveDocumentState = async (
  state: Partial<DocumentConverterState>
) => {
  if (!isBrowser()) return;

  try {
    const existingStateStr = localStorage.getItem("documentConverterState");
    const existingState = existingStateStr ? JSON.parse(existingStateStr) : {};

    const storedState: Partial<StoredState> = {
      ...existingState,
      fileName: state.fileName ?? existingState.fileName ?? null,
      fullText: state.fullText ?? existingState.fullText ?? null,
      summary: state.summary ?? existingState.summary ?? null,
      timestamp: Date.now(),
    };

    // Convert blobs to base64
    if (state.documentBlob instanceof Blob) {
      storedState.documentBlob = await blobToBase64(state.documentBlob);
    }

    if (state.fullTextAudioBlob instanceof Blob) {
      storedState.fullTextAudioBlob = await blobToBase64(
        state.fullTextAudioBlob
      );
    }

    if (state.summaryAudioBlob instanceof Blob) {
      storedState.summaryAudioBlob = await blobToBase64(state.summaryAudioBlob);
    }

    localStorage.setItem("documentConverterState", JSON.stringify(storedState));
  } catch (error) {
    console.error("Error saving document converter state:", error);
  }
};

// Load state from local storage
export const loadDocumentState = (): DocumentConverterState | null => {
  if (!isBrowser()) return null;

  try {
    const savedState = localStorage.getItem("documentConverterState");
    if (!savedState) return null;

    const state = JSON.parse(savedState) as StoredState;

    // Check if state has expired
    if (Date.now() - state.timestamp > STATE_EXPIRY) {
      localStorage.removeItem("documentConverterState");
      return null;
    }

    const result: DocumentConverterState = {
      documentBlob: null,
      fileName: state.fileName,
      fullText: state.fullText,
      summary: state.summary,
      fullTextAudioBlob: null,
      summaryAudioBlob: null,
    };

    // Convert base64 strings back to blobs
    if (state.documentBlob) {
      try {
        // Determine document type from base64 header
        const type = state.documentBlob.split(";")[0].split(":")[1];
        result.documentBlob = base64ToBlob(state.documentBlob, type);
      } catch (error) {
        console.error("Error converting document blob:", error);
      }
    }

    if (state.fullTextAudioBlob) {
      try {
        result.fullTextAudioBlob = base64ToBlob(
          state.fullTextAudioBlob,
          "audio/mp3"
        );
      } catch (error) {
        console.error("Error converting full text audio blob:", error);
      }
    }

    if (state.summaryAudioBlob) {
      try {
        result.summaryAudioBlob = base64ToBlob(
          state.summaryAudioBlob,
          "audio/mp3"
        );
      } catch (error) {
        console.error("Error converting summary audio blob:", error);
      }
    }

    return result;
  } catch (error) {
    console.error("Error loading document converter state:", error);
    return null;
  }
};

// Clear state from local storage
export const clearDocumentState = () => {
  if (!isBrowser()) return;
  localStorage.removeItem("documentConverterState");
};
