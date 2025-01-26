export const COST_RATES = {
  transcription: 6, // $0.006 * 1000
  summarization: {
    input: 30, // $0.03 per 1K tokens * 1000
    output: 60, // $0.06 per 1K tokens * 1000
  },
  tts: 15, // $0.015 per 1K chars * 1000
} as const;

export function estimateCosts(params: {
  audioLength?: number; // in minutes
  textLength?: number; // in characters
  summaryLength?: number; // estimated summary length in characters
}) {
  console.log("Cost Calculator Input:", params);

  const costs = {
    transcription: 0,
    summarization: 0,
    tts: 0,
    total: 0,
  };

  if (params.audioLength) {
    costs.transcription = params.audioLength * COST_RATES.transcription;
  }

  if (params.textLength) {
    // Convert characters to tokens (roughly 4 chars per token)
    const inputTokens = Math.ceil(params.textLength / 4);
    const outputTokens = Math.ceil((params.textLength * 0.2) / 4); // Summary is ~20% of original

    // Calculate cost in credits
    costs.summarization =
      (inputTokens * COST_RATES.summarization.input) / 1000 +
      (outputTokens * COST_RATES.summarization.output) / 1000;

    console.log("Summarization cost:", {
      inputTokens,
      outputTokens,
      cost: costs.summarization,
    });
  }

  if (params.summaryLength) {
    // Calculate TTS cost in credits
    costs.tts = (params.summaryLength * COST_RATES.tts) / 1000;
    console.log("TTS cost:", {
      chars: params.summaryLength,
      cost: costs.tts,
    });
  }

  // Round each cost component before total
  costs.transcription = Math.ceil(costs.transcription);
  costs.summarization = Math.ceil(costs.summarization);
  costs.tts = Math.ceil(costs.tts);
  costs.total = costs.transcription + costs.summarization + costs.tts;

  console.log("Final costs:", costs);

  return costs;
}

export function calculateOperationCosts(
  wordCount: number,
  operation: "transcribe" | "summarize" | "tts"
) {
  // Convert words to characters (average 5 chars per word)
  const charCount = wordCount * 5;

  switch (operation) {
    case "transcribe":
      // For transcription, we should use a different calculation
      // since it's based on word count directly
      return Math.ceil((wordCount * COST_RATES.transcription) / 1000);
    case "summarize":
      return Math.ceil(
        estimateCosts({
          textLength: charCount,
          summaryLength: Math.ceil(charCount * 0.2),
        }).summarization
      );
    case "tts":
      return Math.ceil(
        estimateCosts({
          summaryLength: charCount,
        }).tts
      );
    default:
      return 0;
  }
}

export function calculateAudioOperationCosts(
  audioLengthInSeconds: number,
  operation: "transcribe" | "summarize" | "tts"
) {
  // Convert seconds to minutes
  const minutes = audioLengthInSeconds / 60;

  // Estimate word count based on average speaking rate (130 words per minute)
  const estimatedWordCount = Math.ceil(minutes * 130);

  switch (operation) {
    case "transcribe":
      // Audio transcription cost based on duration
      return Math.ceil(minutes * COST_RATES.transcription);
    case "summarize":
      // Summarization based on estimated word count
      return Math.ceil(
        estimateCosts({
          textLength: estimatedWordCount * 5, // Convert to chars
          summaryLength: Math.ceil(estimatedWordCount * 5 * 0.2),
        }).summarization
      );
    case "tts":
      // TTS cost for the summary (20% of original length)
      return Math.ceil(
        estimateCosts({
          summaryLength: Math.ceil(estimatedWordCount * 5 * 0.2),
        }).tts
      );
    default:
      return 0;
  }
}
