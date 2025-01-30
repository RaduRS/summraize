"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Upload, Download } from "lucide-react";
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

interface ProcessingResult {
  transcription: string;
  audioUrl: string;
  summary?: string;
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

  const MAX_RECORDING_TIME = 60; // 1 minute max

  useEffect(() => {
    if (isAuthenticated === false) {
      sessionStorage.setItem("redirectAfterAuth", "/voice-assistant");
      router.push("/sign-up");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated === false) {
    return null;
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Use more iOS-compatible options
      const options = {
        mimeType: "audio/webm;codecs=opus",
      };

      // Check if the browser supports WebM
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        // Fallback for iOS
        options.mimeType = "audio/mp4";
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Start the recording timer
      setRecordingTime(0);
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
        handleAudioReady(audioBlob);
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
    if (mediaRecorderRef.current && isRecording) {
      // Clear the recording timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      // Save the final recording time
      setFinalDuration(recordingTime);
      setAudioDuration(recordingTime);

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);

      // Wait for the ondataavailable event to complete
      await new Promise<void>((resolve) => {
        if (!mediaRecorderRef.current) return resolve();

        mediaRecorderRef.current.onstop = async () => {
          // Use the same MIME type as used when starting the recording
          const audioBlob = new Blob(chunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || "audio/mp4",
          });
          console.log("Recording stopped, blob type:", audioBlob.type);

          // Now update the UI with the processed audio
          setAudioBlob(audioBlob);
          setResult(null);
          setTtsAudioUrl(null);

          // Set duration using the recording time as it's more reliable
          setAudioDuration(recordingTime);
          setFinalDuration(recordingTime);
          resolve();
        };
      });
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

  const handleAudioReady = async (blob: Blob) => {
    console.log("Audio ready with type:", blob.type);

    // For iOS compatibility, if the blob is not in a supported format, convert it
    let finalBlob = blob;
    if (
      blob.type === "audio/webm" &&
      !MediaRecorder.isTypeSupported("audio/webm")
    ) {
      finalBlob = new Blob([blob], { type: "audio/mp4" });
    }

    // Set duration using the recording time as it's more reliable for recordings
    if (recordingTime > 0) {
      setAudioDuration(recordingTime);
      setFinalDuration(recordingTime);
    } else {
      // For uploaded files, try to get the duration
      const audio = new Audio();
      const url = URL.createObjectURL(finalBlob);

      try {
        await new Promise((resolve) => {
          const handleLoad = () => {
            audio.removeEventListener("loadedmetadata", handleLoad);
            audio.removeEventListener("error", handleError);
            resolve(null);
          };

          const handleError = () => {
            audio.removeEventListener("loadedmetadata", handleLoad);
            audio.removeEventListener("error", handleError);
            console.log(
              "Could not load audio metadata, using default duration"
            );
            resolve(null);
          };

          audio.addEventListener("loadedmetadata", handleLoad);
          audio.addEventListener("error", handleError);
          audio.src = url;
        });

        if (
          audio.duration &&
          !isNaN(audio.duration) &&
          isFinite(audio.duration)
        ) {
          setAudioDuration(audio.duration);
          setFinalDuration(audio.duration);
        }
      } catch (error) {
        console.error("Error loading audio:", error);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    setAudioBlob(finalBlob);
    setResult(null);
    setTtsAudioUrl(null);
  };

  const transcribe = async () => {
    if (!audioBlob) return;

    try {
      // Calculate total required credits first
      const totalRequiredCredits = getRemainingCost("transcribe");

      // Check if user has enough credits before starting
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

      setIsProcessing(true);
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      formData.append("duration", audioDuration.toString());

      const response2 = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data2 = await response2.json();
      if (!response2.ok) {
        if (response2.status === 402) {
          setInsufficientCreditsData({
            required: data2.required,
            available: data2.available,
          });
          setShowInsufficientCreditsModal(true);
          return;
        }
        if (response2.status === 401) {
          // Handle unauthorized - redirect to sign in
          router.push("/sign-in");
          return;
        }
        throw new Error(data2.error || "Failed to process audio");
      }

      // Create local URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob);

      setResult({
        transcription: data2.text,
        audioUrl: audioUrl,
      });
      creditsEvent.emit();

      // Show toast with credits deducted
      toast({
        title: "Operation Complete",
        description: `${data2.creditsDeducted} credits were deducted from your account`,
      });
    } catch (err: any) {
      console.error("Error processing audio:", err);
      toast({
        title: "Error",
        description: err.message || "Error processing audio",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSummary = async () => {
    try {
      // Calculate total required credits first
      const totalRequiredCredits = getRemainingCost("summary");

      // Check if user has enough credits before starting
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
      let transcription = result?.transcription;
      if (!transcription) {
        setIsProcessing(true);
        const formData = new FormData();
        formData.append("audio", audioBlob!, "audio.webm");
        const response = await fetch("/api/process-audio", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 402) {
            setInsufficientCreditsData({
              required: data.required,
              available: data.available,
            });
            setShowInsufficientCreditsModal(true);
            return;
          }
          if (response.status === 401) {
            // Handle unauthorized - redirect to sign in
            router.push("/sign-in");
            return;
          }
          throw new Error(data.error || "Failed to process audio");
        }
        transcription = data.text;
        setResult({
          transcription: data.text,
          audioUrl: URL.createObjectURL(audioBlob!),
        });
        setIsProcessing(false);
        totalCreditsDeducted += data.creditsDeducted;
      }

      // Step 2: Generate summary
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
        if (summaryResponse.status === 401) {
          // Handle unauthorized - redirect to sign in
          router.push("/sign-in");
          return;
        }
        throw new Error(summaryData.error || "Failed to generate summary");
      }

      setResult((prev) =>
        prev ? { ...prev, summary: summaryData.summary } : null
      );
      creditsEvent.emit();
      totalCreditsDeducted += summaryData.creditsDeducted;

      // Show single toast with total credits deducted
      toast({
        title: "Operation Complete",
        description: `${totalCreditsDeducted} credits were deducted from your account`,
      });
    } catch (err: any) {
      console.error("Error generating summary:", err);
      toast({
        title: "Error",
        description:
          err.message || "Error generating summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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

  // Add a cleanup effect
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8 p-4 sm:p-8">
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
                  Audio Ready
                  {recordingTime > 0
                    ? ` (${Math.floor(finalDuration / 60)}:${(finalDuration % 60).toString().padStart(2, "0")})`
                    : ""}
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
                onError={() => alert("Error playing audio")}
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
                onClick={transcribe}
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
                onClick={async () => {
                  try {
                    // Calculate total required credits first
                    const totalRequiredCredits = getRemainingCost("speech");

                    // Check if user has enough credits before starting
                    const response = await fetch("/api/check-credits", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        requiredCredits: totalRequiredCredits,
                      }),
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

                    setIsProcessing(true);
                    let totalCreditsDeducted = 0;

                    // Step 1: Transcribe if needed
                    let transcription = result?.transcription;
                    if (!transcription) {
                      const formData = new FormData();
                      formData.append("audio", audioBlob!, "audio.webm");
                      formData.append("duration", audioDuration.toString());
                      const response = await fetch("/api/process-audio", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await response.json();
                      if (!response.ok) {
                        if (response.status === 402) {
                          setInsufficientCreditsData({
                            required: data.required,
                            available: data.available,
                          });
                          setShowInsufficientCreditsModal(true);
                          return;
                        }
                        throw new Error(
                          data.error || "Failed to process audio"
                        );
                      }
                      transcription = data.text;
                      setResult({
                        transcription: data.text,
                        audioUrl: URL.createObjectURL(audioBlob!),
                      });
                      totalCreditsDeducted += data.creditsDeducted;
                    }

                    // Step 2: Generate summary if needed
                    let summaryText = result?.summary;
                    if (!summaryText) {
                      setIsSummaryLoading(true);
                      const summaryResponse = await fetch("/api/summarize", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: transcription }),
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
                        throw new Error(
                          summaryData.error || "Failed to generate summary"
                        );
                      }
                      summaryText = summaryData.summary;
                      setResult((prev) =>
                        prev ? { ...prev, summary: summaryData.summary } : null
                      );
                      totalCreditsDeducted += summaryData.creditsDeducted;
                    }

                    // Step 3: Generate speech
                    setIsTtsLoading(true);
                    const ttsResponse = await fetch("/api/text-to-speech", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        text: summaryText,
                      }),
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
                      throw new Error(
                        ttsData.error || "Failed to generate speech"
                      );
                    }
                    setTtsAudioUrl(ttsData.audioUrl);
                    totalCreditsDeducted += ttsData.creditsDeducted;
                    creditsEvent.emit();

                    // Show a single toast with total credits deducted
                    toast({
                      title: "Operation Complete",
                      description: `${totalCreditsDeducted} credits were deducted from your account`,
                    });
                  } catch (error: any) {
                    console.error("Error in speech generation chain:", error);
                    toast({
                      title: "Error",
                      description:
                        error.message || "An error occurred during processing",
                      variant: "destructive",
                    });
                  } finally {
                    setIsProcessing(false);
                    setIsSummaryLoading(false);
                    setIsTtsLoading(false);
                  }
                }}
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

            {result?.transcription && (
              <div className="space-y-2">
                <h3 className="font-semibold">Transcription</h3>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg whitespace-pre-line leading-relaxed">
                  {result.transcription}
                </div>
              </div>
            )}

            {result?.summary && (
              <div className="space-y-2">
                <h3 className="font-semibold">Summary</h3>
                <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg [&>p]:mb-4 last:[&>p]:mb-0">
                  {result.summary.split("\n\n").map((paragraph, i) => (
                    <p key={i}>
                      {paragraph.split(/(\*[^*]+\*)/).map((part, j) => {
                        if (part.startsWith("*") && part.endsWith("*")) {
                          return <strong key={j}>{part.slice(1, -1)}</strong>;
                        }
                        return part;
                      })}
                    </p>
                  ))}
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
