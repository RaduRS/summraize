export const SUPPORTED_FORMATS = {
  mp3: "MP3 - Most compatible",
  wav: "WAV - Uncompressed",
  ogg: "OGG - Open format",
  m4a: "M4A - Apple format",
} as const;

export type AudioFormat = keyof typeof SUPPORTED_FORMATS;
