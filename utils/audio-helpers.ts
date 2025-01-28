import { toast } from "@/hooks/use-toast";

// Helper function to write strings to DataView
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Convert WebM to WAV format
export const convertToWav = async (blob: Blob): Promise<Blob> => {
  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Create an offline context for rendering
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  // Create a buffer source
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  // Render the audio
  const renderedBuffer = await offlineContext.startRendering();

  // Convert to WAV format
  const wavBlob = await new Promise<Blob>((resolve) => {
    const length = renderedBuffer.length;
    const numberOfChannels = renderedBuffer.numberOfChannels;
    const sampleRate = renderedBuffer.sampleRate;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // WAV header
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, "data");
    view.setUint32(40, dataSize, true);

    // Write audio data
    const offset = 44;
    const channelData = new Float32Array(length);
    const volume = 0.8; // Adjust volume to prevent clipping

    for (let channel = 0; channel < numberOfChannels; channel++) {
      renderedBuffer.copyFromChannel(channelData, channel);
      let pos = offset;
      for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i])) * volume;
        view.setInt16(
          pos,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
        pos += bytesPerSample;
      }
    }

    resolve(new Blob([buffer], { type: "audio/wav" }));
  });

  return wavBlob;
};

// Download audio file
export const downloadAudio = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    let blob = await response.blob();

    // If it's a WebM file, convert to WAV
    if (blob.type === "audio/webm") {
      blob = await convertToWav(blob);
      filename = filename.replace(".webm", ".wav");
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Download error:", error);
    toast({
      title: "Download Error",
      description: "Failed to download the audio file",
      variant: "destructive",
    });
  }
};
