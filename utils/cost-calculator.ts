export const COST_RATES = {
  // Deepgram: $0.0043/min = 4.3 credits/min * 4x markup = 17.2 credits/min, rounded to 18
  transcription: 18,
  summarization: {
    // DeepSeek costs per 1M tokens:
    // Input: $0.14 = 140 credits per 1M tokens = 0.14 credits per 1K tokens * 4x = 0.56
    // Input (cache miss): $0.55 = 550 credits per 1M tokens = 0.55 credits per 1K tokens * 4x = 2.2
    // Output: $2.19 = 2190 credits per 1M tokens = 2.19 credits per 1K tokens * 4x = 8.76
    input: 0.56,
    input_cache_miss: 2.2,
    output: 8.76,
  },
  // Google Cloud TTS: $0.000004 per char = 4 credits per 1M chars = 0.004 credits per 1K chars * 4x = 0.016
  tts: 0.032,
  // GPT-4-Vision Mini: $0.005 per image = 5 credits * 4x = 20 credits
  image_ocr: 20,
  // Flat fee for PDF/TXT processing (local processing)
  pdf_processing: 5,
} as const;

export function estimateCosts(params: {
  audioLength?: number; // in seconds
  textLength?: number; // in characters
  summaryLength?: number; // estimated summary length in characters
  isImageOcr?: boolean; // whether this is an image OCR operation
  isPdfOrText?: boolean; // whether this is a PDF/TXT file
}) {
  const costs = {
    transcription: 0,
    summarization: 0,
    tts: 0,
    image_ocr: 0,
    total: 0,
  };

  // For PDF/TXT files, charge flat fee plus summarization and TTS if requested
  if (params.isPdfOrText) {
    // Add flat fee for PDF/TXT processing
    costs.transcription = COST_RATES.pdf_processing;

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

      // Calculate cost in credits, assuming 20% cache hit rate
      const cacheMissRatio = 0.8; // 80% cache miss rate
      const cacheHitRatio = 0.2; // 20% cache hit rate

      costs.summarization =
        (inputTokens *
          COST_RATES.summarization.input_cache_miss *
          cacheMissRatio +
          inputTokens * COST_RATES.summarization.input * cacheHitRatio +
          outputTokens * COST_RATES.summarization.output) /
        1000;
    }

    if (params.summaryLength) {
      const bufferedLength = Math.ceil(params.summaryLength * 1.1);
      const roundedLength = Math.ceil(bufferedLength / 100) * 100;
      costs.tts = (roundedLength * COST_RATES.tts) / 1000;
    }

    // Round and return costs for PDF/TXT
    costs.transcription = Math.ceil(costs.transcription);
    costs.summarization = Math.ceil(costs.summarization);
    costs.tts = Math.ceil(costs.tts);
    costs.total = costs.transcription + costs.summarization + costs.tts;
    return costs;
  }

  // Rest of the existing logic for audio/image processing
  if (params.audioLength) {
    const fullMinutes = Math.ceil(params.audioLength / 60);
    costs.transcription = fullMinutes * COST_RATES.transcription;
  }

  if (params.textLength && !params.isPdfOrText) {
    // Existing summarization logic for non-PDF/TXT files
    const inputTokens = Math.ceil(params.textLength / 4);
    let summaryRatio = 0.2;
    if (inputTokens > 5000) summaryRatio = 0.1;
    else if (inputTokens > 2000) summaryRatio = 0.15;

    const outputTokens = Math.ceil(inputTokens * summaryRatio);
    const cacheMissRatio = 0.8;
    const cacheHitRatio = 0.2;

    costs.summarization =
      (inputTokens *
        COST_RATES.summarization.input_cache_miss *
        cacheMissRatio +
        inputTokens * COST_RATES.summarization.input * cacheHitRatio +
        outputTokens * COST_RATES.summarization.output) /
      1000;
  }

  if (params.summaryLength && !params.isPdfOrText) {
    const bufferedLength = Math.ceil(params.summaryLength * 1.1);
    const roundedLength = Math.ceil(bufferedLength / 100) * 100;
    costs.tts = (roundedLength * COST_RATES.tts) / 1000;
  }

  if (params.isImageOcr) {
    costs.image_ocr = COST_RATES.image_ocr;
  }

  // Round each cost component up to nearest credit
  costs.transcription = Math.ceil(costs.transcription);
  costs.summarization = Math.ceil(costs.summarization);
  costs.tts = Math.ceil(costs.tts);
  costs.image_ocr = Math.ceil(costs.image_ocr);
  costs.total =
    costs.transcription + costs.summarization + costs.tts + costs.image_ocr;

  return costs;
}

export function calculateOperationCosts(
  wordCount: number,
  operation: "transcribe" | "summarize" | "tts",
  isImage: boolean = false,
  actualCharCount?: number // Add parameter for actual character count
) {
  // Convert words to characters (average 5 chars per word)
  const charCount = actualCharCount || wordCount * 5;

  switch (operation) {
    case "transcribe":
      if (isImage) {
        return COST_RATES.image_ocr;
      }
      // For transcription, calculate based on estimated duration
      // Assuming average speaking rate of 150 words per minute
      const estimatedMinutes = Math.ceil(wordCount / 150);
      return estimatedMinutes * COST_RATES.transcription;
    case "summarize":
      return Math.ceil(
        estimateCosts({
          textLength: charCount,
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
      // Charge per full minute
      return Math.ceil(audioLengthInSeconds / 60) * COST_RATES.transcription;
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
