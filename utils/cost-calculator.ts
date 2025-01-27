export const COST_RATES = {
  transcription: 6, // $0.006 per minute = 6 credits per minute
  summarization: {
    input: 30, // $0.03 per 1K tokens = 30 credits per 1K tokens
    output: 60, // $0.06 per 1K tokens = 60 credits per 1K tokens
  },
  tts: 15, // $0.015 per 1K chars = 15 credits per 1K chars
} as const;

export function estimateCosts(params: {
  audioLength?: number; // in seconds
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
    // Convert seconds to minutes and calculate cost
    // For more accurate cost, we charge per 10-second increment
    const tenSecondIncrements = Math.ceil(params.audioLength / 10);
    costs.transcription = tenSecondIncrements;
  }

  if (params.textLength) {
    // Convert characters to tokens (roughly 4 chars per token)
    const inputTokens = Math.ceil(params.textLength / 4);

    // For more accurate summary length:
    // - Short texts (<2K tokens): 20% of original
    // - Medium texts (2K-5K tokens): 15% of original
    // - Long texts (>5K tokens): 10% of original
    let summaryRatio = 0.2;
    if (inputTokens > 5000) summaryRatio = 0.1;
    else if (inputTokens > 2000) summaryRatio = 0.15;

    const outputTokens = Math.ceil(inputTokens * summaryRatio);

    // Calculate cost in credits
    costs.summarization =
      (inputTokens * COST_RATES.summarization.input) / 1000 +
      (outputTokens * COST_RATES.summarization.output) / 1000;

    console.log("Summarization cost:", {
      inputTokens,
      outputTokens,
      summaryRatio,
      cost: costs.summarization,
    });
  }

  if (params.summaryLength) {
    // Calculate TTS cost in credits
    // For more accurate TTS cost:
    // 1. Add 10% buffer for punctuation and formatting
    // 2. Round up to nearest 100 chars for consistent pricing
    const bufferedLength = Math.ceil(params.summaryLength * 1.1);
    const roundedLength = Math.ceil(bufferedLength / 100) * 100;
    costs.tts = (roundedLength * COST_RATES.tts) / 1000;
    console.log("TTS cost:", {
      chars: params.summaryLength,
      bufferedLength,
      roundedLength,
      cost: costs.tts,
    });
  }

  // Round each cost component up to nearest credit
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
      // For transcription, calculate based on estimated duration
      // Assuming average speaking rate of 150 words per minute (faster than previous 130)
      const estimatedSeconds = Math.ceil((wordCount / 150) * 60);
      // Charge per 10-second increment
      return Math.ceil(estimatedSeconds / 10);
    case "summarize":
      return Math.ceil(
        estimateCosts({
          textLength: charCount,
          summaryLength: Math.ceil(charCount * 0.2),
        }).summarization
      );
    case "tts":
      // Add buffer and round to nearest 100 chars
      const bufferedLength = Math.ceil(charCount * 1.1);
      const roundedLength = Math.ceil(bufferedLength / 100) * 100;
      return Math.ceil(
        estimateCosts({
          summaryLength: roundedLength,
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
  switch (operation) {
    case "transcribe":
      // Charge per 10-second increment
      return Math.ceil(audioLengthInSeconds / 10);
    case "summarize": {
      // Estimate word count based on audio duration
      // Assuming 150 words per minute
      const estimatedWords = Math.ceil((audioLengthInSeconds / 60) * 150);
      const estimatedChars = estimatedWords * 5;
      return Math.ceil(
        estimateCosts({
          textLength: estimatedChars,
        }).summarization
      );
    }
    case "tts": {
      // Estimate summary length from audio duration
      // Assuming 150 words per minute, then taking 20% for summary
      const estimatedWords = Math.ceil((audioLengthInSeconds / 60) * 150);
      const estimatedSummaryChars = Math.ceil(estimatedWords * 5 * 0.2);
      // Round to nearest 100 chars
      const roundedLength = Math.ceil(estimatedSummaryChars / 100) * 100;
      return Math.ceil(
        estimateCosts({
          summaryLength: roundedLength,
        }).tts
      );
    }
    default:
      return 0;
  }
}
