import { createClient } from "@/utils/supabase/server";

export const VOICE_TIERS = {
  JOURNEY: {
    name: "journey",
    quota: 1000000, // 1M characters
    voiceId: "journey",
  },
  WAVENET: {
    name: "wavenet",
    quota: 2000000, // 2M characters
    voiceId: "wavenet",
  },
  NEURAL2: {
    name: "neural2",
    quota: 3000000, // 3M characters
    voiceId: "neural2",
  },
  STANDARD: {
    name: "standard",
    quota: Infinity,
    voiceId: "standard",
  },
} as const;

export type VoiceTier = keyof typeof VOICE_TIERS;

interface TotalUsage {
  journey_chars: number;
  wavenet_chars: number;
  neural2_chars: number;
  standard_chars: number;
}

export async function checkTotalTTSUsage(request: Request): Promise<{
  selectedTier: (typeof VOICE_TIERS)[VoiceTier];
  usage: TotalUsage;
}> {
  const supabase = createClient(request);

  // Get current total usage
  const { data: totalUsage } = await supabase
    .from("total_tts_usage")
    .select("*")
    .single();

  if (!totalUsage) {
    // If no usage record exists, use highest tier
    return {
      selectedTier: VOICE_TIERS.JOURNEY,
      usage: {
        journey_chars: 0,
        wavenet_chars: 0,
        neural2_chars: 0,
        standard_chars: 0,
      },
    };
  }

  // Check if we need to reset monthly quota
  const lastReset = new Date(totalUsage.last_reset);
  const now = new Date();
  if (
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear()
  ) {
    // Reset quotas for new month
    await supabase
      .from("total_tts_usage")
      .update({
        journey_chars: 0,
        wavenet_chars: 0,
        neural2_chars: 0,
        standard_chars: 0,
        last_reset: now.toISOString(),
      })
      .eq("id", totalUsage.id);

    return {
      selectedTier: VOICE_TIERS.JOURNEY,
      usage: {
        journey_chars: 0,
        wavenet_chars: 0,
        neural2_chars: 0,
        standard_chars: 0,
      },
    };
  }

  // Select tier based on total usage
  let selectedTier;
  if (totalUsage.journey_chars < VOICE_TIERS.JOURNEY.quota) {
    selectedTier = VOICE_TIERS.JOURNEY;
  } else if (totalUsage.wavenet_chars < VOICE_TIERS.WAVENET.quota) {
    selectedTier = VOICE_TIERS.WAVENET;
  } else if (totalUsage.neural2_chars < VOICE_TIERS.NEURAL2.quota) {
    selectedTier = VOICE_TIERS.NEURAL2;
  } else {
    selectedTier = VOICE_TIERS.STANDARD;
  }

  return {
    selectedTier,
    usage: totalUsage,
  };
}

export async function updateTotalTTSUsage(
  request: Request,
  tier: string,
  charactersUsed: number
): Promise<void> {
  const supabase = createClient(request);

  // Update the total characters used for this tier
  await supabase.rpc("increment_total_tts_usage", {
    tier,
    chars_used: charactersUsed,
  });
}
