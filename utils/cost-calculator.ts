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
