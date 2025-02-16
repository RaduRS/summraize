"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Upload, Download, Copy } from "lucide-react";
import { AudioVisualizer } from "@/components/audio-visualizer";
import { AudioPlayer } from "@/components/audio-player";
import { CostButton } from "@/components/cost-button";
import { calculateAudioOperationCosts } from "@/utils/cost-calculator";
import { creditsEvent } from "@/lib/credits-event";
import { InsufficientCreditsModal } from "@/components/insufficient-credits-modal";
import { useToast } from "@/hooks/use-toast";
import { downloadAudio } from "@/utils/audio-helpers";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { formatTranscript } from "@/helpers/formatTranscript";
import {
  saveVoiceAssistantState,
  loadVoiceAssistantState,
  clearVoiceAssistantState,
  blobToBase64,
  VoiceAssistantState as StoredVoiceAssistantState,
} from "../lib/state-persistence";

interface ProcessingResult {
  transcription: string;
  audioUrl: string;
  summary?: string;
}

interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word: string;
}

export default function VoiceAssistant() {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [finalDuration, setFinalDuration] = useState<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] =
    useState(false);
  const [insufficientCreditsData, setInsufficientCreditsData] = useState<{
    required: number;
    available: number;
  } | null>(null);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [partialTranscript, setPartialTranscript] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);
  const processorRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [showRestoreNotice, setShowRestoreNotice] = useState(false);

  // Add a function to reset all state
  const resetAllState = () => {
    // Revoke any existing object URLs first
    if (result?.audioUrl) {
      URL.revokeObjectURL(result.audioUrl);
    }
    if (ttsAudioUrl) {
      URL.revokeObjectURL(ttsAudioUrl);
    }

    setAudioBlob(null);
    setResult(null);
    setPartialTranscript("");
    setWords([]);
    setTtsAudioUrl(null);
    setAudioDuration(0);
    setFinalDuration(0);
    setRecordingTime(0);
    setIsRecording(false);
    setIsProcessing(false);
    setIsTranscribing(false);

    // Clear any existing timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (isAuthenticated === false) {
      sessionStorage.setItem("redirectAfterAuth", "/voice-assistant");
      router.push("/sign-up");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated === false) {
    return null;
  }

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadVoiceAssistantState();
    if (savedState) {
      try {
        // Always restore transcription and words if they exist
        if (savedState.transcription) {
          setPartialTranscript(savedState.transcription);
        }
        if (savedState.words) {
          setWords(savedState.words);
        }

        // Restore audio blob and related state if it exists
        if (savedState.audioBlob) {
          // Create a new blob with the same data and type
          const newBlob = new Blob([savedState.audioBlob], {
            type: savedState.audioBlob.type || "audio/wav",
          });
          setAudioBlob(newBlob);
          setAudioDuration(savedState.audioDuration || 0);
          setFinalDuration(savedState.finalDuration || 0);

          // Create fresh audio URL from the new blob
          const audioUrl = URL.createObjectURL(newBlob);

          // Set initial result with audio URL and transcription
          setResult({
            transcription: savedState.transcription || "",
            audioUrl,
            summary: savedState.summary || "",
          });

          // Restore TTS audio if it exists
          if (savedState.ttsAudioBlob) {
            // Create a new blob for TTS audio as well
            const newTtsBlob = new Blob([savedState.ttsAudioBlob], {
              type: savedState.ttsAudioBlob.type || "audio/mp3",
            });
            const ttsUrl = URL.createObjectURL(newTtsBlob);
            setTtsAudioUrl(ttsUrl);
          }

          setShowRestoreNotice(true);
          setTimeout(() => setShowRestoreNotice(false), 3000);
        }
      } catch (error) {
        console.error("Error restoring session:", error);
        // If restoration fails, clear everything
        clearVoiceAssistantState();
        resetAllState();
      }
    }

    // Cleanup function to revoke URLs when component unmounts
    return () => {
      if (result?.audioUrl) {
        URL.revokeObjectURL(result.audioUrl);
      }
      if (ttsAudioUrl) {
        URL.revokeObjectURL(ttsAudioUrl);
      }
    };
  }, []);

  // Save state when important data changes
  useEffect(() => {
    const saveState = async () => {
      if (!audioBlob) return;

      const state: Partial<StoredVoiceAssistantState> = {
        audioBlob,
        transcription: result?.transcription || null,
        summary: result?.summary || null,
        audioDuration,
        finalDuration,
        words,
      };

      // If we have TTS audio, get the blob
      if (ttsAudioUrl) {
        try {
          const response = await fetch(ttsAudioUrl);
          const ttsBlob = await response.blob();
          state.ttsAudioBlob = ttsBlob;
        } catch (error) {
          console.error("Error getting TTS blob:", error);
        }
      }

      await saveVoiceAssistantState(state);
    };

    saveState();
  }, [
    audioBlob,
    result?.transcription,
    result?.summary,
    ttsAudioUrl,
    audioDuration,
    finalDuration,
    words,
  ]);

  // Add a function to handle audio errors and try to recover
  const handleAudioError = async () => {
    if (audioBlob) {
      try {
        // Create a new blob URL
        const newUrl = URL.createObjectURL(audioBlob);
        setResult((prev) =>
          prev
            ? {
                ...prev,
                audioUrl: newUrl,
              }
            : null
        );

        // Clean up old URL after a short delay
        setTimeout(() => {
          if (result?.audioUrl && result.audioUrl !== newUrl) {
            URL.revokeObjectURL(result.audioUrl);
          }
        }, 1000);
      } catch (error) {
        console.error("Error recovering audio playback:", error);
        toast({
          title: "Playback Error",
          description: "Unable to play audio. Please try recording again.",
          variant: "destructive",
        });
      }
    }
  };

  const startRecording = async () => {
    try {
      // Clear existing state and saved state
      clearVoiceAssistantState(); // Clear the saved state first

      // Clear all results from UI
      setResult((prev) =>
        prev
          ? {
              audioUrl: "", // Will be set with new recording
              transcription: "",
              summary: "",
            }
          : null
      );
      setPartialTranscript("");
      setWords([]);
      if (ttsAudioUrl) {
        URL.revokeObjectURL(ttsAudioUrl);
        setTtsAudioUrl(null);
      }

      // Clear recording related state
      setAudioBlob(null);
      setAudioDuration(0);
      setFinalDuration(0);
      setRecordingTime(0);
      setIsRecording(false);
      setIsProcessing(false);
      setIsTranscribing(false);

      // Clear any existing timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Revoke any existing audio URL
      if (result?.audioUrl) {
        URL.revokeObjectURL(result.audioUrl);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = []; // Reset chunks

      // Initialize WebSocket connection
      wsRef.current = new WebSocket(
        `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1`,
        ["token", process.env.DEEPGRAM_API_KEY as string]
      );

      // Create audio context and processor
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(
        2048,
        1,
        1
      );
      processorRef.current = source;

      // Connect audio nodes
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      // Handle audio processing
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          // Get audio data
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert to 16-bit PCM
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.min(1, inputData[i]) * 0x7fff;
          }
          // Send audio data
          wsRef.current.send(pcmData.buffer);
        }
      };

      // Handle WebSocket messages
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.channel?.alternatives?.[0]?.transcript) {
          setPartialTranscript(
            (prev) => prev + " " + data.channel.alternatives[0].transcript
          );
        }
      };

      // Use more iOS-compatible options for recording
      const options = {
        mimeType: "audio/webm;codecs=opus",
      };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = "audio/mp4";
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Start the recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((time) => time + 1);
      }, 1000);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        await handleAudioReady(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast({
        title: "Microphone Error",
        description: "Please ensure you have granted microphone permission.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    try {
      if (!mediaRecorderRef.current || !isRecording) return;

      // Save the current recording time before any cleanup
      const currentTime = recordingTime;

      // Set the duration immediately
      setFinalDuration(currentTime);
      setAudioDuration(currentTime);

      // Stop recording first to ensure all data is captured
      mediaRecorderRef.current.stop();
      const tracks = mediaRecorderRef.current.stream.getTracks();
      tracks.forEach((track) => track.stop());

      // Clean up WebSocket and audio processing
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Clear the recording timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Create the audio blob
      const finalBlob = new Blob(chunksRef.current, {
        type: mediaRecorderRef.current.mimeType || "audio/mp4",
      });

      // Set recording state
      setIsRecording(false);
      setIsTranscribing(false);

      // Handle the audio blob
      await handleAudioReady(finalBlob);

      // Store the final transcript
      if (partialTranscript) {
        setResult((prev) =>
          prev
            ? {
                ...prev,
                transcription: partialTranscript.trim(),
              }
            : null
        );
        setPartialTranscript("");
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast({
        title: "Error",
        description: "Failed to stop recording properly. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAudioReady = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      // For iOS compatibility, if the blob is not in a supported format, convert it
      let finalBlob = blob;
      if (
        blob.type === "audio/webm" &&
        !MediaRecorder.isTypeSupported("audio/webm")
      ) {
        finalBlob = new Blob([blob], { type: "audio/mp4" });
      }

      // Log original size
      console.log(
        "Original audio size:",
        (finalBlob.size / (1024 * 1024)).toFixed(2) + " MB"
      );

      // Compress audio if larger than 1MB
      if (finalBlob.size > 1024 * 1024) {
        try {
          const compressedBlob = await compressAudio(finalBlob);
          console.log(
            "Compressed audio size:",
            (compressedBlob.size / (1024 * 1024)).toFixed(2) + " MB"
          );
          console.log(
            "Compression ratio:",
            (finalBlob.size / compressedBlob.size).toFixed(2) + "x"
          );

          // Only use compressed version if it's actually smaller
          if (compressedBlob.size < finalBlob.size) {
            finalBlob = compressedBlob;
          } else {
            console.log("Compression did not reduce file size, using original");
          }
        } catch (error) {
          // Just log compression error and continue with original blob
          console.log(
            "Compression skipped:",
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      }

      // Create audio URL and set blob
      const audioUrl = URL.createObjectURL(finalBlob);
      setAudioBlob(finalBlob);

      // Set the result with the audio URL
      setResult({
        transcription: "",
        audioUrl,
        summary: "",
      });

      // Only try to get duration if we don't already have it from recording time
      if (recordingTime <= 0) {
        try {
          const duration = await getAudioDuration(finalBlob);
          if (duration && isFinite(duration) && duration > 0) {
            const finalDuration = Math.ceil(duration);
            setAudioDuration(finalDuration);
            setFinalDuration(finalDuration);
          }
        } catch (error) {
          console.log(
            "Could not get audio duration:",
            error instanceof Error ? error.message : "Unknown error"
          );
          // Don't throw - we might already have duration from recording time
        }
      }

      setTtsAudioUrl(null);
    } catch (error) {
      // Only show error if we actually failed to process the audio
      if (!audioBlob || !result?.audioUrl) {
        console.error(
          "Failed to process audio:",
          error instanceof Error ? error.message : "Unknown error"
        );
        toast({
          title: "Processing Error",
          description: "Failed to process audio file. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to get audio duration
  const getAudioDuration = (blob: Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(blob);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };
      audio.onerror = reject;
    });
  };

  const compressAudio = async (audioBlob: Blob): Promise<Blob> => {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Calculate target sample rate based on duration
    const duration = audioBuffer.duration;
    let targetSampleRate = 22050; // Better quality default (half of 44.1kHz)

    // For longer audio, reduce quality slightly
    if (duration > 30) {
      targetSampleRate = 16000; // Still good for speech
    }

    // Create offline context for rendering
    const offlineCtx = new OfflineAudioContext(
      1, // mono
      Math.ceil(
        audioBuffer.length * (targetSampleRate / audioBuffer.sampleRate)
      ),
      targetSampleRate
    );

    // Create buffer source
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    // Add compression chain
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // Add a high-shelf filter to preserve some high frequencies
    const highShelf = offlineCtx.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = 4000;
    highShelf.gain.value = 3;

    // Add low-pass filter
    const lowpass = offlineCtx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = targetSampleRate * 0.75;
    lowpass.Q.value = 0.7;

    // Connect nodes
    source.connect(compressor);
    compressor.connect(highShelf);
    highShelf.connect(lowpass);
    lowpass.connect(offlineCtx.destination);
    source.start();

    // Render audio
    const renderedBuffer = await offlineCtx.startRendering();

    // Convert to WAV
    const length = renderedBuffer.length * 2;
    const outputBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(outputBuffer);
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // WAV header
    writeString(0, "RIFF");
    view.setUint32(4, 36 + length, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length, true);

    // Audio data with normalization
    const samples = new Int16Array(renderedBuffer.length);
    const channelData = renderedBuffer.getChannelData(0);

    // Find peak for normalization
    let peak = 0;
    for (let i = 0; i < renderedBuffer.length; i++) {
      peak = Math.max(peak, Math.abs(channelData[i]));
    }

    // Apply normalization with headroom
    const normalizeScale = peak > 0 ? 0.95 / peak : 1;
    for (let i = 0; i < renderedBuffer.length; i++) {
      let sample = channelData[i] * normalizeScale;

      // Soft knee compression
      const threshold = 0.75;
      if (Math.abs(sample) > threshold) {
        const excess = Math.abs(sample) - threshold;
        const compression = excess * 0.3;
        sample = Math.sign(sample) * (threshold + excess - compression);
      }

      samples[i] = Math.max(
        -32768,
        Math.min(32767, Math.floor(sample * 32767))
      );
    }

    new Uint8Array(outputBuffer, 44).set(new Uint8Array(samples.buffer));

    return new Blob([outputBuffer], { type: "audio/wav" });
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to process audio");

      const data = await response.json();
      // Initialize result with just transcription and audio URL
      setResult({
        transcription: data.transcription,
        audioUrl: data.audioUrl,
        summary: "", // Empty string instead of actual summary
      });
    } catch (err) {
      console.error("Error processing audio:", err);
      alert("Error processing audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File validation checks...
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an audio file smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    // Support more audio formats for iOS
    const supportedTypes = [
      "audio/wav",
      "audio/mpeg",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
      "audio/*",
    ];

    if (
      !supportedTypes.includes(file.type) &&
      !file.type.startsWith("audio/")
    ) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a valid audio file",
        variant: "destructive",
      });
      return;
    }

    // Clear existing state and saved state
    clearVoiceAssistantState(); // Clear the saved state first

    // Clear all results from UI
    setResult((prev) =>
      prev
        ? {
            audioUrl: "", // Will be set with new file
            transcription: "",
            summary: "",
          }
        : null
    );
    setPartialTranscript("");
    setWords([]);
    if (ttsAudioUrl) {
      URL.revokeObjectURL(ttsAudioUrl);
      setTtsAudioUrl(null);
    }

    // Clear audio related state
    setAudioBlob(null);
    setAudioDuration(0);
    setFinalDuration(0);

    // Revoke any existing audio URL
    if (result?.audioUrl) {
      URL.revokeObjectURL(result.audioUrl);
    }

    // Handle the new file
    handleAudioReady(file);
  };

  const transcribeIfNeeded = async () => {
    if (!result?.transcription) {
      setIsTranscribing(true);
      setIsProcessing(true);
      let transcribeCredits = 0;
      const formData = new FormData();
      formData.append("audio", audioBlob!, "audio.webm");
      formData.append("duration", audioDuration.toString());

      try {
        const transcribeResponse = await fetch("/api/stream-transcribe", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!transcribeResponse.ok) {
          const errorData = await transcribeResponse.json();
          throw new Error(errorData.error || "Failed to start transcription");
        }

        const reader = transcribeResponse.body?.getReader();
        const decoder = new TextDecoder();
        let transcriptParts: string[] = [];

        if (!reader) {
          throw new Error("Failed to create stream reader");
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.transcript) {
                  setPartialTranscript((prev) => {
                    const newTranscript = prev
                      ? `${prev} ${data.transcript}`
                      : data.transcript;
                    return formatTranscript(newTranscript);
                  });

                  if (data.words && data.words.length > 0) {
                    setWords((prevWords) => {
                      const newWords = data.words.filter((word: Word) => {
                        const wordKey = `${word.start}-${word.end}-${word.word}`;
                        return !prevWords.some(
                          (w) => `${w.start}-${w.end}-${w.word}` === wordKey
                        );
                      });
                      return [...prevWords, ...newWords];
                    });
                  }

                  if (data.is_final) {
                    transcriptParts.push(data.transcript);
                  }

                  if (data.creditsDeducted) {
                    transcribeCredits = data.creditsDeducted;
                  }
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }

        const finalTranscript = formatTranscript(
          transcriptParts.join(" ").trim()
        );

        // Update result while preserving the existing audioUrl
        setResult((prev) => ({
          transcription: finalTranscript,
          audioUrl: prev?.audioUrl || "",
          summary: prev?.summary || "",
        }));

        setPartialTranscript(finalTranscript);
        return { text: finalTranscript, credits: transcribeCredits };
      } catch (error) {
        console.error("Transcription error:", error);
        throw error;
      } finally {
        setIsTranscribing(false);
        setIsProcessing(false);
      }
    }
    return { text: result.transcription, credits: 0 };
  };

  const generateSummary = async () => {
    try {
      const totalRequiredCredits = getRemainingCost("summary");
      const response = await fetch("/api/check-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiredCredits: totalRequiredCredits }),
        credentials: "include",
      });

      const data = await response.json();
      if (response.status === 402) {
        setInsufficientCreditsData({
          required: totalRequiredCredits,
          available: data.available,
        });
        setShowInsufficientCreditsModal(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to check credits");
      }

      setIsSummaryLoading(true);
      let totalCreditsDeducted = 0;

      // Step 1: Transcribe if needed
      const { text: transcription, credits: transcribeCredits } =
        await transcribeIfNeeded();
      if (!transcription) {
        throw new Error("Failed to get transcription");
      }
      totalCreditsDeducted += transcribeCredits;

      // Step 2: Generate summary
      const summaryResponse = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcription }),
        credentials: "include",
      });

      let summaryData;
      try {
        const rawText = await summaryResponse.text();
        summaryData = JSON.parse(rawText);
      } catch (parseError: any) {
        console.error("Error parsing summary response:", parseError);
        throw new Error(
          `Invalid response from summary API: ${parseError.message}`
        );
      }

      if (!summaryResponse.ok) {
        if (summaryResponse.status === 402) {
          setInsufficientCreditsData({
            required: summaryData.required,
            available: summaryData.available,
          });
          setShowInsufficientCreditsModal(true);
          return;
        }
        throw new Error(
          summaryData.error ||
            `Failed to generate summary (${summaryResponse.status})`
        );
      }

      if (!summaryData.summary) {
        throw new Error("No summary returned from API");
      }

      if (summaryData.provider === "openai") {
        toast({
          title: "Using Backup Service",
          description:
            "Primary service was unavailable, using using different service instead",
          variant: "default",
        });
      }

      setResult((prev) =>
        prev ? { ...prev, summary: summaryData.summary } : null
      );
      totalCreditsDeducted += summaryData.creditsDeducted;
      creditsEvent.emit();

      // Show one toast with total credits deducted
      toast({
        title: "Operation Complete",
        description: `${totalCreditsDeducted} credits were deducted for ${
          transcribeCredits > 0 ? "transcription and summary" : "summary"
        }`,
      });
    } catch (error: any) {
      console.error("Error generating summary:", error);
      toast({
        title: "Summary Generation Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setIsSummaryLoading(false);
    }
  };

  const generateSpeech = async () => {
    try {
      setIsTtsLoading(true);
      let totalCreditsDeducted = 0;
      let operations: string[] = [];

      const totalRequiredCredits = getRemainingCost("speech");
      const response = await fetch("/api/check-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiredCredits: totalRequiredCredits }),
        credentials: "include",
      });

      const data = await response.json();
      if (response.status === 402) {
        setInsufficientCreditsData({
          required: totalRequiredCredits,
          available: data.available,
        });
        setShowInsufficientCreditsModal(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to check credits");
      }

      // Step 1: Transcribe if needed
      const { text: transcription, credits: transcribeCredits } =
        await transcribeIfNeeded();
      if (!transcription) {
        throw new Error("Failed to get transcription");
      }
      if (transcribeCredits > 0) {
        totalCreditsDeducted += transcribeCredits;
        operations.push("transcription");
      }

      // Step 2: Generate summary if needed
      let summaryText = result?.summary;
      if (!summaryText) {
        setIsSummaryLoading(true);
        const summaryResponse = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: transcription }),
          credentials: "include",
        });

        const summaryData = await summaryResponse.json();
        if (!summaryResponse.ok) {
          if (summaryResponse.status === 402) {
            setInsufficientCreditsData({
              required: summaryData.required,
              available: summaryData.available,
            });
            setShowInsufficientCreditsModal(true);
            return;
          }
          throw new Error(summaryData.error || "Failed to generate summary");
        }

        summaryText = summaryData.summary;
        setResult((prev) =>
          prev ? { ...prev, summary: summaryData.summary } : null
        );
        totalCreditsDeducted += summaryData.creditsDeducted;
        operations.push("summary");
      }

      // Step 3: Generate speech
      if (!summaryText) {
        throw new Error("No summary text available");
      }

      const cleanedText = cleanTextForSpeech(summaryText);
      const ttsResponse = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanedText }),
        credentials: "include",
      });

      const ttsData = await ttsResponse.json();
      if (!ttsResponse.ok) {
        if (ttsResponse.status === 402) {
          setInsufficientCreditsData({
            required: ttsData.required,
            available: ttsData.available,
          });
          setShowInsufficientCreditsModal(true);
          return;
        }
        throw new Error(ttsData.error || "Failed to generate speech");
      }

      // Pre-load the audio to ensure it's valid
      try {
        const audioResponse = await fetch(ttsData.audioUrl);
        if (!audioResponse.ok) {
          throw new Error("Failed to load audio file");
        }
        const audioBlob = await audioResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        setTtsAudioUrl(audioUrl);
      } catch (error) {
        console.error("Error loading TTS audio:", error);
        throw new Error("Failed to load TTS audio");
      }

      totalCreditsDeducted += ttsData.creditsDeducted;
      operations.push("speech");
      creditsEvent.emit();

      // Show one toast with total credits deducted and operations performed
      let operationsText = operations.join(", ");
      if (operations.length === 1) {
        operationsText = operations[0];
      } else if (operations.length === 2) {
        operationsText = operations.join(" and ");
      } else if (operations.length === 3) {
        operationsText = `${operations[0]}, ${operations[1]} and ${operations[2]}`;
      }

      toast({
        title: "Operation Complete",
        description: `${totalCreditsDeducted} credits were deducted for ${operationsText}`,
      });
    } catch (error: any) {
      console.error("Error in speech generation chain:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate speech",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setIsSummaryLoading(false);
      setIsTtsLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !result) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((error) => {
        console.error("Playback error:", error);
        alert(
          "Error playing audio. The link might have expired. Please record again."
        );
        setIsPlaying(false);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const toggleTtsPlayback = () => {
    if (!ttsAudioRef.current || !ttsAudioUrl) return;

    if (isTtsPlaying) {
      ttsAudioRef.current.pause();
    } else {
      ttsAudioRef.current.play().catch((error) => {
        console.error("TTS playback error:", error);
        alert("Error playing TTS audio. Please try generating it again.");
        setIsTtsPlaying(false);
      });
    }
    setIsTtsPlaying(!isTtsPlaying);
  };

  const calculateCosts = (duration: number) => {
    const transcribeCost = calculateAudioOperationCosts(duration, "transcribe");
    const summarizeCost = calculateAudioOperationCosts(duration, "summarize");
    const ttsCost = calculateAudioOperationCosts(duration, "tts");

    return {
      transcribe: transcribeCost,
      summary: transcribeCost + summarizeCost,
      speech: transcribeCost + summarizeCost + ttsCost,
    };
  };

  const getRemainingCost = (operation: "transcribe" | "summary" | "speech") => {
    if (!audioDuration || isNaN(audioDuration) || !isFinite(audioDuration)) {
      return 0;
    }

    const allCosts = calculateCosts(audioDuration);

    switch (operation) {
      case "transcribe":
        return allCosts.transcribe;

      case "summary":
        // If already transcribed, only charge for summary
        if (result?.transcription) {
          return allCosts.summary - allCosts.transcribe;
        }
        return allCosts.summary;

      case "speech":
        if (result?.transcription && result?.summary) {
          // If both transcription and summary exist, only charge for TTS
          return allCosts.speech - allCosts.summary;
        } else if (result?.transcription) {
          // If only transcription exists, charge for summary + TTS
          return allCosts.speech - allCosts.transcribe;
        }
        return allCosts.speech;
    }
  };

  const handleTranscribe = async () => {
    try {
      const totalRequiredCredits = getRemainingCost("transcribe");
      const response = await fetch("/api/check-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiredCredits: totalRequiredCredits }),
        credentials: "include",
      });

      const data = await response.json();
      if (response.status === 402) {
        setInsufficientCreditsData({
          required: totalRequiredCredits,
          available: data.available,
        });
        setShowInsufficientCreditsModal(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to check credits");
      }

      const { text: transcription, credits: transcribeCredits } =
        await transcribeIfNeeded();
      if (!transcription) {
        throw new Error("Failed to get transcription");
      }

      creditsEvent.emit();
      toast({
        title: "Operation Complete",
        description: `${transcribeCredits} credits were deducted for transcription`,
      });
    } catch (error: any) {
      console.error("Error in transcription:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to transcribe",
        variant: "destructive",
      });
    }
  };

  // Add a cleanup effect
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Add the sanitizeForCopy function
  const sanitizeForCopy = (text: string) => {
    return text
      .replace(/##\s+/g, "") // Remove ## headers
      .replace(/\*([^*]+)\*/g, "$1") // Remove asterisks but keep the content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n\n");
  };

  // Clean up text for speech by adding periods after titles and removing formatting
  const cleanTextForSpeech = (text: string) => {
    return text
      .replace(/##\s+([^.\n]+)(?!\.)(?=\n|$)/g, "## $1.") // Add period after titles if missing
      .replace(/##\s+/g, "") // Remove ## headers but keep the added periods
      .replace(/\*([^*]+)\*/g, "$1") // Remove asterisks but keep the content
      .replace(/\n+/g, " ") // Replace line breaks with spaces
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();
  };

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8 p-4 sm:p-8">
      {showRestoreNotice && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-md shadow-lg z-50 flex items-center gap-2"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Previous session restored
        </motion.div>
      )}
      <div
        className={`w-full max-w-2xl space-y-4 ${!audioBlob ? "h-[calc(100vh-8rem)] flex flex-col justify-center" : ""}`}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-center">
          Voice Assistant
        </h1>
        <p className="text-muted-foreground text-center px-4">
          Record your voice and get an AI-generated summary
        </p>

        <div className="border rounded-lg p-4 bg-muted/50">
          <AudioVisualizer isRecording={isRecording} />
          {isRecording && (
            <div className="text-center mt-2 font-mono text-sm">
              {Math.floor(recordingTime / 60)}:
              {(recordingTime % 60).toString().padStart(2, "0")}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {!isRecording ? (
            <>
              <Button
                onClick={startRecording}
                disabled={isProcessing}
                size="lg"
                className="w-full sm:w-32 px-2"
              >
                <Mic className="w-4 h-4 mr-2" strokeWidth={2} />
                Record
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                variant="outline"
                size="lg"
                className="w-full sm:w-32 px-2"
              >
                <Upload className="w-4 h-4 mr-2" strokeWidth={2} />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,audio/wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/aac"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          ) : (
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="w-full sm:w-32"
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
        </div>

        {audioBlob && (
          <div className="w-full max-w-2xl space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Audio Ready{" "}
                  {finalDuration > 0 &&
                    ` (${Math.floor(finalDuration / 60)}:${(finalDuration % 60).toString().padStart(2, "0")})`}
                </h4>
                <Button
                  onClick={() => {
                    if (audioBlob) {
                      const url = URL.createObjectURL(audioBlob);
                      downloadAudio(url, `recording-${Date.now()}.wav`);
                      URL.revokeObjectURL(url);
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <AudioPlayer
                src={result?.audioUrl || URL.createObjectURL(audioBlob)}
                onError={handleAudioError}
                initialDuration={finalDuration}
                onLoadedMetadata={(e) => {
                  const audio = e.target as HTMLAudioElement;
                  if (
                    audio.duration &&
                    !isNaN(audio.duration) &&
                    isFinite(audio.duration)
                  ) {
                    setAudioDuration(audio.duration);
                  } else {
                    setAudioDuration(finalDuration);
                  }
                }}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <CostButton
                onClick={handleTranscribe}
                disabled={
                  isProcessing ||
                  isSummaryLoading ||
                  isTtsLoading ||
                  !!result?.transcription
                }
                isLoading={!result?.transcription && isProcessing}
                cost={
                  result?.transcription
                    ? undefined
                    : getRemainingCost("transcribe")
                }
                className="w-full sm:w-[180px]"
              >
                Transcribe Audio
              </CostButton>

              <CostButton
                onClick={generateSummary}
                disabled={
                  isProcessing ||
                  isSummaryLoading ||
                  isTtsLoading ||
                  !!result?.summary
                }
                isLoading={!result?.summary && isSummaryLoading}
                cost={result?.summary ? undefined : getRemainingCost("summary")}
                className="w-full sm:w-[180px]"
              >
                Generate Summary
              </CostButton>

              <CostButton
                onClick={generateSpeech}
                disabled={
                  isProcessing ||
                  isSummaryLoading ||
                  isTtsLoading ||
                  !!ttsAudioUrl
                }
                isLoading={!ttsAudioUrl && isTtsLoading}
                cost={ttsAudioUrl ? undefined : getRemainingCost("speech")}
                className="w-full sm:w-[180px]"
              >
                Generate Speech
              </CostButton>
            </div>

            {/* Show real-time transcription only when there are words or active transcription */}
            {((isRecording || isTranscribing) &&
              partialTranscript.trim().length > 0) ||
            (result?.transcription && !isRecording && !isTranscribing) ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Transcription</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      const sanitizedText = sanitizeForCopy(partialTranscript);
                      navigator.clipboard.writeText(sanitizedText);
                      toast({
                        title: "Copied!",
                        description: "Transcription copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg [&>p]:mb-4 last:[&>p]:mb-0">
                  <div className="whitespace-pre-wrap">
                    <AnimatePresence mode="popLayout">
                      {words.length > 0 ? (
                        <div>
                          {partialTranscript
                            .split("\n")
                            .map((paragraph, pIndex) => (
                              <motion.div
                                key={pIndex}
                                className="mb-4 last:mb-0 select-text"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  duration: 0.2,
                                  ease: "easeOut",
                                }}
                              >
                                {paragraph
                                  .split(" ")
                                  .filter(Boolean)
                                  .map((word, wIndex, arr) => (
                                    <motion.span
                                      key={`${pIndex}-${wIndex}-${word}`}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      transition={{
                                        duration:
                                          audioDuration > 60 ? 0.05 : 0.15,
                                        ease: "easeOut",
                                      }}
                                    >
                                      {word}
                                      {/* Add space after word unless it's the last word */}
                                      {wIndex < arr.length - 1 ? " " : ""}
                                    </motion.span>
                                  ))}
                                {/* Add cursor after the last word in the paragraph */}
                                {(isTranscribing || isRecording) &&
                                  pIndex ===
                                    partialTranscript.split("\n").length -
                                      1 && (
                                    <motion.span
                                      key="cursor"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: [0, 1, 0] }}
                                      transition={{
                                        duration: audioDuration > 60 ? 0.5 : 1,
                                        repeat: Infinity,
                                        ease: "linear",
                                      }}
                                      className="inline-block w-0.5 h-4 bg-muted-foreground ml-1 align-middle"
                                    />
                                  )}
                              </motion.div>
                            ))}
                        </div>
                      ) : !isRecording &&
                        !isTranscribing &&
                        result?.transcription ? (
                        <div className="select-text">
                          {result.transcription
                            .split("\n")
                            .map((paragraph, pIndex) => (
                              <div key={pIndex} className="mb-4 last:mb-0">
                                {paragraph}
                              </div>
                            ))}
                        </div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            ) : null}

            {result?.summary && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Summary</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      if (!result?.summary) return;
                      const sanitizedText = sanitizeForCopy(result.summary);
                      navigator.clipboard.writeText(sanitizedText);
                      toast({
                        title: "Copied!",
                        description: "Summary copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg [&>p]:mb-4 last:[&>p]:mb-0">
                  <div className="whitespace-pre-wrap select-text">
                    {result.summary
                      .replace(
                        /\. (However|But|So|Then|After|Before|When|While|In|On|At|The|One|It|This|That|These|Those|My|His|Her|Their|Our|Your|If|Although|Though|Unless|Since|Because|As|And)\s/g,
                        ".\n\n$1 "
                      )
                      .replace(
                        /(Hi,|Hello,|Hey,|Greetings,|Welcome,)([^.!?]+[.!?])/g,
                        "$1$2\n\n"
                      )
                      .replace(/([.!?])\s*"([^"]+)"/g, '$1\n\n"$2"')
                      .replace(
                        /([.!?])\s*([A-Z][a-z]+\s+said|asked|replied|exclaimed)/g,
                        "$1\n\n$2"
                      )
                      // Ensure ## headers are on their own line
                      .replace(/([^.\n])(##\s+[^\n]+)/g, "$1\n\n$2")
                      .replace(/([.!?])\s*(##\s+[^\n]+)/g, "$1\n\n$2")
                      .replace(/[^\S\n]+/g, " ")
                      .replace(/\n{3,}/g, "\n\n")
                      .trim()
                      .split(/\n(?=##\s|[^#])/g) // Split on newlines, keeping ## headers with their content
                      .map((paragraph, pIndex) => {
                        // Check if this is a header (starts with ##)
                        if (paragraph.trim().startsWith("## ")) {
                          return (
                            <h3 key={pIndex} className="font-bold text-lg mt-2">
                              {paragraph.trim().replace("## ", "")}
                            </h3>
                          );
                        }

                        // Handle regular paragraphs with single asterisks for bold
                        return (
                          <div key={pIndex} className="mb-4 last:mb-0">
                            {paragraph
                              .trim()
                              .split(/(\*[^*]+\*)/)
                              .map((part, j) => {
                                if (
                                  part.startsWith("*") &&
                                  part.endsWith("*")
                                ) {
                                  return (
                                    <strong key={j}>{part.slice(1, -1)}</strong>
                                  );
                                }
                                return part;
                              })}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {ttsAudioUrl && (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Summary Audio
                  </h4>
                  <Button
                    onClick={() => {
                      if (ttsAudioUrl) {
                        downloadAudio(ttsAudioUrl, `summary-${Date.now()}.mp3`);
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <AudioPlayer
                  src={ttsAudioUrl}
                  onError={() => alert("Error loading TTS audio")}
                />
              </div>
            )}
          </div>
        )}
      </div>
      <InsufficientCreditsModal
        isOpen={showInsufficientCreditsModal}
        onClose={() => setShowInsufficientCreditsModal(false)}
        requiredCredits={insufficientCreditsData?.required ?? 0}
        availableCredits={insufficientCreditsData?.available ?? 0}
      />
    </div>
  );
}
