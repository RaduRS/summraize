"use client";

import { useState, useRef, useEffect } from "react";
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
import {
  estimateCosts,
  calculateAudioOperationCosts,
} from "@/utils/cost-calculator";
import { creditsEvent } from "@/lib/credits-event";
import { InsufficientCreditsModal } from "@/components/insufficient-credits-modal";
import { useToast } from "@/hooks/use-toast";

interface ProcessingResult {
  transcription: string;
  audioUrl: string;
  summary?: string; // Make summary optional
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

  const MAX_RECORDING_TIME = 60; // 1 minute max

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
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
        mediaRecorderRef.current!.onstop = async () => {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

          // Process audio duration before showing UI
          const audio = new Audio();
          const url = URL.createObjectURL(audioBlob);

          try {
            await new Promise((resolve, reject) => {
              audio.addEventListener("loadedmetadata", resolve);
              audio.addEventListener("error", reject);
              audio.src = url;
            });

            if (
              audio.duration &&
              !isNaN(audio.duration) &&
              isFinite(audio.duration)
            ) {
              setAudioDuration(audio.duration);
            } else {
              setAudioDuration(finalDuration); // Use recorded duration as fallback
            }
          } catch (error) {
            console.error("Error loading audio:", error);
            setAudioDuration(finalDuration);
          } finally {
            URL.revokeObjectURL(url);
          }

          // Now update the UI with the processed audio
          setAudioBlob(audioBlob);
          setResult(null);
          setTtsAudioUrl(null);
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
    // Create an audio element to get duration
    const audio = new Audio();
    const url = URL.createObjectURL(blob);

    try {
      // Wait for audio metadata to load
      await new Promise((resolve, reject) => {
        audio.addEventListener("loadedmetadata", resolve);
        audio.addEventListener("error", reject);
        audio.src = url;
      });

      // Set duration if valid, otherwise use recordingTime
      if (
        audio.duration &&
        !isNaN(audio.duration) &&
        isFinite(audio.duration)
      ) {
        setAudioDuration(audio.duration);
        setFinalDuration(audio.duration);
      } else {
        setAudioDuration(recordingTime);
        setFinalDuration(recordingTime);
      }
    } catch (error) {
      console.error("Error loading audio:", error);
      // Use recordingTime as fallback
      setAudioDuration(recordingTime);
      setFinalDuration(recordingTime);
    } finally {
      // Cleanup
      URL.revokeObjectURL(url);
    }

    setAudioBlob(blob);
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
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      formData.append("duration", audioDuration.toString());

      const response2 = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
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
          setInsufficientCreditsData({
            required: data.required,
            available: data.available,
          });
          setShowInsufficientCreditsModal(true);
          return;
        }
        throw new Error(data.details || "Failed to generate speech");
      }

      setTtsAudioUrl(data.audioUrl);
      creditsEvent.emit();

      // Show toast with actual cost
      toast({
        title: "Speech Generated",
        description: `${Math.ceil(data.cost)} credits used`,
      });
    } catch (err: any) {
      console.error("Error generating speech:", err);
      alert(err.message || "Error generating speech. Please try again.");
    } finally {
      setIsTtsLoading(false);
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
        throw new Error(summaryData.details || "Failed to generate summary");
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
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-center">Voice Assistant</h1>
        <p className="text-muted-foreground text-center">
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
                  {recordingTime > 0
                    ? ` (${Math.floor(finalDuration / 60)}:${(finalDuration % 60).toString().padStart(2, "0")})`
                    : ""}
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

            <div className="flex justify-between gap-4">
              <CostButton
                onClick={transcribe}
                disabled={
                  isProcessing ||
                  isSummaryLoading ||
                  isTtsLoading ||
                  !!result?.transcription
                }
                isLoading={isProcessing}
                cost={
                  result?.transcription
                    ? undefined
                    : getRemainingCost("transcribe")
                }
                className="w-[180px]"
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
                isLoading={isSummaryLoading}
                cost={result?.summary ? undefined : getRemainingCost("summary")}
                className="w-[180px]"
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

                    // Step 2: Generate summary
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
                    setResult((prev) =>
                      prev ? { ...prev, summary: summaryData.summary } : null
                    );
                    totalCreditsDeducted += summaryData.creditsDeducted;

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
                isLoading={isTtsLoading}
                cost={ttsAudioUrl ? undefined : getRemainingCost("speech")}
                className="w-[180px]"
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
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg whitespace-pre-line leading-relaxed">
                  {result.summary}
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
      <InsufficientCreditsModal
        isOpen={showInsufficientCreditsModal}
        onClose={() => setShowInsufficientCreditsModal(false)}
        requiredCredits={insufficientCreditsData?.required || 0}
        availableCredits={insufficientCreditsData?.available || 0}
      />
    </div>
  );
}
