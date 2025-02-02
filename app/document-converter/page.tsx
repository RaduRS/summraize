"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/audio-player";
import { Upload, Download, Copy } from "lucide-react";
import { CostButton } from "@/components/cost-button";
import { creditsEvent } from "@/lib/credits-event";
import { InsufficientCreditsModal } from "@/components/insufficient-credits-modal";
import { useToast } from "@/hooks/use-toast";
import { downloadAudio } from "@/utils/audio-helpers";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface ProcessingResult {
  text: string;
  summary?: string;
}

interface FileAnalysis {
  wordCount: number;
  isEstimate: boolean;
  transcriptionCost: number;
  fullTextCost: number;
  summaryCost: number;
  estimateRange?: {
    minWordCount: number;
    maxWordCount: number;
  };
}

export default function DocumentConverter() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [fullTextAudioUrl, setFullTextAudioUrl] = useState<string | null>(null);
  const [summaryAudioUrl, setSummaryAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] =
    useState(false);
  const [insufficientCreditsData, setInsufficientCreditsData] = useState<{
    required: number;
    available: number;
  } | null>(null);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === false) {
      sessionStorage.setItem("redirectAfterAuth", "/document-converter");
      router.push("/sign-up");
    }
  }, [isAuthenticated, router]);

  // Cleanup effect for object URLs
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (fullTextAudioUrl) {
        URL.revokeObjectURL(fullTextAudioUrl);
      }
      if (summaryAudioUrl) {
        URL.revokeObjectURL(summaryAudioUrl);
      }
    };
  }, []);

  // Effect to cleanup old URLs when new ones are created
  useEffect(() => {
    return () => {
      if (fullTextAudioUrl) {
        URL.revokeObjectURL(fullTextAudioUrl);
      }
    };
  }, [fullTextAudioUrl]);

  useEffect(() => {
    return () => {
      if (summaryAudioUrl) {
        URL.revokeObjectURL(summaryAudioUrl);
      }
    };
  }, [summaryAudioUrl]);

  if (isAuthenticated === false) {
    return null;
  }

  const analyzeFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze-file", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze file");
      }

      setFileAnalysis({
        wordCount: data.wordCount,
        isEstimate: data.isEstimate,
        transcriptionCost: data.costs.transcription,
        fullTextCost: data.costs.fullText,
        summaryCost: data.costs.summary,
        estimateRange: data.estimateRange,
      });
    } catch (error) {
      console.error("Error analyzing file:", error);
    }
  };

  const generatePreview = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/generate-preview", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate preview");
      }

      return data.previewUrl;
    } catch (error) {
      console.error("Preview generation failed:", error);
      return null;
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

    setSelectedFile(file);
    setResult(null);
    setFullTextAudioUrl(null);
    setSummaryAudioUrl(null);

    // Generate preview for all file types using FormData
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/generate-preview", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate preview");
      }

      setPreviewUrl(data.previewUrl);
    } catch (error) {
      console.error("Error generating preview:", error);
      setPreviewUrl("/document-icon.png"); // Fallback to generic icon
    }

    // Analyze file content
    await analyzeFile(file);
  };

  const transcribe = async () => {
    if (!selectedFile) return;

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
      formData.append("file", selectedFile);

      const response2 = await fetch("/api/process-document", {
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
        throw new Error(data2.error || "Failed to process document");
      }

      setResult({ text: data2.text });
      creditsEvent.emit();

      // Show toast with credits deducted
      toast({
        title: "Operation Complete",
        description: `${data2.creditsDeducted} credits were deducted from your account`,
      });
    } catch (error: any) {
      console.error("Error processing document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

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

  // Add the sanitizeForTTS function
  const sanitizeForTTS = (text: string) => {
    return text
      .replace(/##\s+([^.\n]+)(?!\.)(?=\n|$)/g, "## $1.") // Add period after titles if missing
      .replace(/##\s+/g, "") // Remove ## headers but keep the added periods
      .replace(/\*([^*]+)\*/g, "$1") // Remove asterisks but keep the content
      .replace(/\n+/g, " ") // Replace line breaks with spaces
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();
  };

  const handleGenerateSpeech = async (mode: "full" | "summary") => {
    try {
      // Calculate total required credits first
      const totalRequiredCredits = getRemainingCost(mode);

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

      let currentText = result?.text;
      let summaryText = result?.summary;
      let totalCreditsDeducted = 0;

      // First transcribe if needed
      if (!currentText) {
        setIsProcessing(true);
        const formData = new FormData();
        formData.append("file", selectedFile!);

        const response = await fetch("/api/process-document", {
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
          throw new Error(data.error || "Failed to process document");
        }

        currentText = data.text;
        setResult({ text: data.text });
        totalCreditsDeducted += data.creditsDeducted;
      }

      // Generate summary if needed
      if (mode === "summary" && !result?.summary) {
        setIsSummaryLoading(true);
        const summaryResponse = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: currentText }),
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

        // Format the summary text with proper paragraph breaks
        const formattedSummary = summaryData.summary
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
          .replace(/[^\S\n]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        summaryText = formattedSummary;
        setResult((prev) =>
          prev ? { ...prev, summary: formattedSummary } : null
        );
        totalCreditsDeducted += summaryData.creditsDeducted;
      }

      // Use the appropriate text for speech
      const textToSpeak = mode === "summary" ? summaryText : currentText;
      if (!textToSpeak) {
        throw new Error("No text available for speech generation");
      }

      // Clean up text for speech using the new sanitizeForTTS function
      const cleanTextForSpeech = sanitizeForTTS(textToSpeak);

      setIsTtsLoading(true);
      const ttsResponse = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanTextForSpeech,
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

        // Store audio URL based on mode
        if (mode === "summary") {
          setSummaryAudioUrl(audioUrl);
        } else {
          setFullTextAudioUrl(audioUrl);
        }
      } catch (error) {
        console.error("Error loading TTS audio:", error);
        throw new Error("Failed to load TTS audio");
      }

      totalCreditsDeducted += ttsData.creditsDeducted;
      creditsEvent.emit();

      // Show a single toast with total credits deducted
      toast({
        title: `${mode === "summary" ? "Summary" : "Full Text"} Generated`,
        description: `${totalCreditsDeducted} credits were deducted from your account`,
      });
    } catch (error: any) {
      console.error("Error in speech generation chain:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred during processing",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setIsSummaryLoading(false);
      setIsTtsLoading(false);
    }
  };

  const getRemainingCost = (operation: "transcribe" | "full" | "summary") => {
    if (!fileAnalysis) return 0;

    switch (operation) {
      case "transcribe":
        return fileAnalysis.transcriptionCost;

      case "full":
        // If already transcribed, only charge for TTS
        if (result?.text) {
          return fileAnalysis.fullTextCost - fileAnalysis.transcriptionCost;
        }
        return fileAnalysis.fullTextCost;

      case "summary":
        if (fullTextAudioUrl) {
          // If full text speech exists, only charge for summary generation and its TTS
          return fileAnalysis.summaryCost - fileAnalysis.fullTextCost;
        } else if (result?.text) {
          // If only transcription exists, charge for summary + TTS
          return fileAnalysis.summaryCost - fileAnalysis.transcriptionCost;
        }
        return fileAnalysis.summaryCost;
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8 p-4 sm:p-8">
      <div
        className={`w-full max-w-2xl space-y-4 ${!selectedFile ? "h-[calc(100vh-8rem)] flex flex-col justify-center" : ""}`}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-center">
          Document Converter
        </h1>
        <p className="text-muted-foreground text-center px-4">
          Convert your documents to speech
        </p>

        <div className="flex justify-center">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            size="lg"
            className="w-full sm:w-48 inline-flex items-center px-2"
          >
            <Upload className="w-4 h-4 mr-2" strokeWidth={2} />
            Upload Document
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {selectedFile && (
          <div className="w-full max-w-2xl space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {previewUrl && (
                  <div className="w-full sm:w-24 h-24 rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={previewUrl}
                      alt="Document preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 w-full">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-muted-foreground break-all">
                        {selectedFile.name}
                      </h4>
                    </div>
                    {fileAnalysis && (
                      <div className="text-sm text-muted-foreground">
                        {result?.text ? (
                          <>
                            Word Count:{" "}
                            {result.text
                              .trim()
                              .split(/\s+/)
                              .length.toLocaleString()}
                          </>
                        ) : (
                          <>
                            Estimated Word Count:{" "}
                            {fileAnalysis.wordCount.toLocaleString()}
                            <span className="block sm:inline text-xs sm:ml-2 text-muted-foreground">
                              (Range:{" "}
                              {fileAnalysis.estimateRange?.minWordCount.toLocaleString()}{" "}
                              -{" "}
                              {fileAnalysis.estimateRange?.maxWordCount.toLocaleString()}{" "}
                              words)
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <CostButton
                onClick={transcribe}
                disabled={Boolean(
                  isProcessing ||
                    isSummaryLoading ||
                    isTtsLoading ||
                    result?.text
                )}
                isLoading={isProcessing && !result?.text}
                cost={result?.text ? undefined : getRemainingCost("transcribe")}
                className="w-full sm:w-[180px]"
              >
                Transcribe Document
              </CostButton>

              <CostButton
                onClick={() => handleGenerateSpeech("full")}
                disabled={Boolean(
                  isProcessing ||
                    isSummaryLoading ||
                    isTtsLoading ||
                    fullTextAudioUrl
                )}
                isLoading={
                  isTtsLoading && !fullTextAudioUrl && !isSummaryLoading
                }
                cost={fullTextAudioUrl ? undefined : getRemainingCost("full")}
                className="w-full sm:w-[180px]"
              >
                Generate Full Speech
              </CostButton>

              <CostButton
                onClick={() => handleGenerateSpeech("summary")}
                disabled={Boolean(
                  isProcessing ||
                    isSummaryLoading ||
                    isTtsLoading ||
                    summaryAudioUrl
                )}
                isLoading={isSummaryLoading && !summaryAudioUrl}
                cost={summaryAudioUrl ? undefined : getRemainingCost("summary")}
                className="w-full sm:w-[200px]"
              >
                Generate Summary Speech
              </CostButton>
            </div>

            {result?.text && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Document Text</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      const sanitizedText = sanitizeForCopy(result.text);
                      navigator.clipboard.writeText(sanitizedText);
                      toast({
                        title: "Copied!",
                        description: "Document text copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg [&>p]:mb-4 last:[&>p]:mb-0 select-text">
                  <div className="whitespace-pre-wrap">
                    {result.text
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
                {fullTextAudioUrl && (
                  <div className="rounded-lg border bg-card p-4 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Full Text Audio
                      </h4>
                      <Button
                        onClick={() => {
                          if (fullTextAudioUrl) {
                            downloadAudio(
                              fullTextAudioUrl,
                              `full-text-${Date.now()}.mp3`
                            );
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
                      src={fullTextAudioUrl}
                      onError={() => alert("Error loading audio")}
                    />
                  </div>
                )}
              </div>
            )}

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
                {summaryAudioUrl && (
                  <div className="rounded-lg border bg-card p-4 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Summary Audio
                      </h4>
                      <Button
                        onClick={() => {
                          if (summaryAudioUrl) {
                            downloadAudio(
                              summaryAudioUrl,
                              `summary-${Date.now()}.mp3`
                            );
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
                      src={summaryAudioUrl}
                      onError={() => alert("Error loading audio")}
                    />
                  </div>
                )}
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
