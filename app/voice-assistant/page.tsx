"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Square,
  Loader2,
  Play,
  Pause,
  Upload,
  Download,
} from "lucide-react";
import { AudioVisualizer } from "@/components/audio-visualizer";
import { AudioPlayer } from "@/components/audio-player";
import { CostButton } from "@/components/cost-button";
import { estimateCosts } from "@/utils/cost-calculator";
import { creditsEvent } from "@/lib/credits-event";

interface ProcessingResult {
  transcription: string;
  audioUrl: string;
  summary?: string; // Make summary optional
}

export default function VoiceAssistant() {
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

  const MAX_RECORDING_TIME = 60; // 1 minute max

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        handleAudioReady(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert(
        "Error accessing microphone. Please ensure you have granted permission."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
    }
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

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    if (!file.type.startsWith("audio/")) {
      alert("Please upload an audio file");
      return;
    }

    // Use the same flow as recording
    handleAudioReady(file);
  };

  const handleAudioReady = (blob: Blob) => {
    setAudioBlob(blob);
    setResult(null);
    setTtsAudioUrl(null);
  };

  const transcribe = async () => {
    if (!audioBlob) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");

      const response = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to process audio");
      }

      // Create local URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob);

      setResult({
        transcription: data.text,
        audioUrl: audioUrl,
      });
      creditsEvent.emit();
    } catch (err: any) {
      console.error("Error processing audio:", err);
      alert(err.message || "Error processing audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const generateTTS = async () => {
    if (!result?.summary) return;

    setIsTtsLoading(true);
    try {
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: result.summary,
          voice: "alloy",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 402) {
          alert(
            `Insufficient credits. Required: ${data.required.toFixed(3)}, Available: ${data.available.toFixed(3)}`
          );
        } else {
          throw new Error(data.details || "Failed to generate speech");
        }
        return;
      }

      setTtsAudioUrl(data.audioUrl);
      creditsEvent.emit();
    } catch (err: any) {
      console.error("Error generating speech:", err);
      alert(err.message || "Error generating speech. Please try again.");
    } finally {
      setIsTtsLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!result?.transcription) return;

    setIsSummaryLoading(true);
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result.transcription }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 402) {
          alert(
            `Insufficient credits.\nCost: ${Math.ceil(data.required)} credits\nAvailable: ${Math.floor(data.available)} credits`
          );
        } else {
          throw new Error(data.details || "Failed to generate summary");
        }
        return;
      }

      setResult((prev) => (prev ? { ...prev, summary: data.summary } : null));
      creditsEvent.emit();
    } catch (err: any) {
      console.error("Error generating summary:", err);
      alert(err.message || "Error generating summary. Please try again.");
    } finally {
      setIsSummaryLoading(false);
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

  const transcriptionCost = audioBlob
    ? Math.ceil(
        estimateCosts({
          audioLength: audioBlob.size / (16000 * 2) / 60, // Convert bytes to minutes
        }).total
      )
    : 0;

  const summaryCost = result?.transcription
    ? Math.ceil(
        estimateCosts({
          textLength: result.transcription.length,
        }).total
      )
    : 0;

  const ttsCost = result?.summary
    ? Math.ceil(
        estimateCosts({
          summaryLength: result.summary.length,
        }).total
      )
    : 0;

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-center">Voice Assistant</h1>
        <p className="text-muted-foreground text-center">
          Record your voice and get an AI-generated summary
        </p>

        <div className="border rounded-lg p-4 bg-muted/50">
          <AudioVisualizer isRecording={isRecording} />
        </div>

        <div className="flex justify-center gap-4">
          {!isRecording ? (
            <>
              <Button
                onClick={startRecording}
                disabled={isProcessing}
                size="lg"
                className="w-32 px-2"
              >
                <Mic className="w-4 h-4 mr-2" strokeWidth={2} />
                Record
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                variant="outline"
                size="lg"
                className="w-32 px-2"
              >
                <Upload className="w-4 h-4 mr-2" strokeWidth={2} />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          ) : (
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="w-32"
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
                  Audio Ready
                </h4>
                <Button
                  onClick={() => window.open(URL.createObjectURL(audioBlob))}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <AudioPlayer
                src={result?.audioUrl || URL.createObjectURL(audioBlob)}
                onError={() => alert("Error playing audio")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CostButton
                onClick={transcribe}
                disabled={Boolean(isProcessing || result?.transcription)}
                isLoading={isProcessing}
                cost={transcriptionCost}
              >
                Transcribe Audio
              </CostButton>

              <CostButton
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    let transcriptionText = result?.transcription;

                    // First transcribe if needed
                    if (!transcriptionText) {
                      const formData = new FormData();
                      formData.append("audio", audioBlob!, "audio.webm");
                      const response = await fetch("/api/process-audio", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(
                          data.error || "Failed to process audio"
                        );
                      }
                      transcriptionText = data.text;
                      setResult({
                        transcription: data.text,
                        audioUrl: URL.createObjectURL(audioBlob!),
                      });
                    }

                    // Then immediately do summary
                    setIsSummaryLoading(true);
                    const response = await fetch("/api/summarize", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        text: transcriptionText,
                      }),
                    });
                    const summaryData = await response.json();
                    if (!response.ok) {
                      throw new Error(
                        summaryData.error || "Failed to generate summary"
                      );
                    }
                    setResult((prev) =>
                      prev ? { ...prev, summary: summaryData.summary } : null
                    );
                    creditsEvent.emit();
                  } catch (error) {
                    console.error("Error in summary generation:", error);
                    alert(
                      "An error occurred during processing. Please try again."
                    );
                  } finally {
                    setIsProcessing(false);
                    setIsSummaryLoading(false);
                  }
                }}
                disabled={Boolean(
                  isProcessing || isSummaryLoading || result?.summary
                )}
                isLoading={isProcessing || isSummaryLoading}
                cost={
                  !result?.transcription
                    ? transcriptionCost + summaryCost
                    : summaryCost
                }
              >
                Generate Summary
              </CostButton>

              <CostButton
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    // Step 1: Transcribe if needed
                    let transcription = result?.transcription;
                    if (!transcription) {
                      const formData = new FormData();
                      formData.append("audio", audioBlob!, "audio.webm");
                      const response = await fetch("/api/process-audio", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(
                          data.error || "Failed to process audio"
                        );
                      }
                      transcription = data.text;
                      setResult({
                        transcription: data.text,
                        audioUrl: URL.createObjectURL(audioBlob!),
                      });
                    }

                    // Step 2: Generate summary
                    setIsSummaryLoading(true);
                    const summaryResponse = await fetch("/api/summarize", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ text: transcription }),
                    });
                    const summaryData = await summaryResponse.json();
                    if (!summaryResponse.ok) {
                      throw new Error(
                        summaryData.error || "Failed to generate summary"
                      );
                    }
                    setResult((prev) =>
                      prev ? { ...prev, summary: summaryData.summary } : null
                    );

                    // Step 3: Generate speech
                    setIsTtsLoading(true);
                    const ttsResponse = await fetch("/api/text-to-speech", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        text: summaryData.summary,
                        voice: "alloy",
                      }),
                    });
                    const ttsData = await ttsResponse.json();
                    if (!ttsResponse.ok) {
                      throw new Error(
                        ttsData.error || "Failed to generate speech"
                      );
                    }
                    setTtsAudioUrl(ttsData.audioUrl);
                    creditsEvent.emit();
                  } catch (error) {
                    console.error("Error in speech generation chain:", error);
                    alert(
                      "An error occurred during processing. Please try again."
                    );
                  } finally {
                    setIsProcessing(false);
                    setIsSummaryLoading(false);
                    setIsTtsLoading(false);
                  }
                }}
                disabled={Boolean(
                  isProcessing ||
                    isSummaryLoading ||
                    isTtsLoading ||
                    ttsAudioUrl
                )}
                isLoading={isProcessing || isSummaryLoading || isTtsLoading}
                cost={
                  !result?.transcription
                    ? transcriptionCost + summaryCost + ttsCost
                    : !result?.summary
                      ? summaryCost + ttsCost
                      : ttsCost
                }
              >
                Generate Speech
              </CostButton>
            </div>

            {result?.transcription && (
              <div className="space-y-2">
                <h3 className="font-semibold">Transcription</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {result.transcription}
                </p>
              </div>
            )}

            {result?.summary && (
              <div className="space-y-2">
                <h3 className="font-semibold">Summary</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {result.summary}
                </p>
              </div>
            )}

            {ttsAudioUrl && (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Summary Audio
                  </h4>
                  <Button
                    onClick={() => window.open(ttsAudioUrl)}
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
    </div>
  );
}
