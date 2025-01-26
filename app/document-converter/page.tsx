"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/audio-player";
import { Upload, Loader2, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CostButton } from "@/components/cost-button";
import { estimateCosts } from "@/utils/cost-calculator";
import { creditsEvent } from "@/lib/credits-event";

interface ProcessingResult {
  text: string;
  summary?: string;
}

export default function DocumentConverter() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [fullTextAudioUrl, setFullTextAudioUrl] = useState<string | null>(null);
  const [summaryAudioUrl, setSummaryAudioUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"full" | "summary">("full");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
  };

  const transcribe = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/process-document", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to process document");
      }

      setResult({ text: data.text });
      creditsEvent.emit();
    } catch (error: any) {
      console.error("Error processing document:", error);
      alert(error.message || "Error processing document. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSpeech = async () => {
    try {
      let currentText = result?.text;
      let summaryText = result?.summary;

      // First transcribe if we don't have the text yet
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
          throw new Error(data.error || "Failed to process document");
        }

        currentText = data.text;
        setResult({ text: data.text });
        creditsEvent.emit();
        setIsProcessing(false);
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
            alert(
              `Insufficient credits.\nCost: ${Math.ceil(summaryData.required)} credits\nAvailable: ${Math.floor(summaryData.available)} credits`
            );
            return;
          }
          throw new Error(summaryData.error || "Failed to generate summary");
        }
        summaryText = summaryData.summary;
        setResult((prev) =>
          prev ? { ...prev, summary: summaryData.summary } : null
        );
      }

      // Use the appropriate text for speech
      const textToSpeak = mode === "summary" ? summaryText : currentText;

      if (!textToSpeak) {
        throw new Error("No text available for speech generation");
      }

      setIsTtsLoading(true);
      const ttsResponse = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          voice: "alloy",
        }),
      });

      const ttsData = await ttsResponse.json();
      if (!ttsResponse.ok) {
        if (ttsResponse.status === 402) {
          alert(
            `Insufficient credits.\nCost: ${Math.ceil(ttsData.required)} credits\nAvailable: ${Math.floor(ttsData.available)} credits`
          );
          return;
        }
        throw new Error(ttsData.error || "Failed to generate speech");
      }

      // Store audio URL based on mode
      if (mode === "summary") {
        setSummaryAudioUrl(ttsData.audioUrl);
      } else {
        setFullTextAudioUrl(ttsData.audioUrl);
      }
      creditsEvent.emit();
    } catch (error: any) {
      console.error("Error in speech generation:", error);
      alert(error.message || "Error generating speech. Please try again.");
    } finally {
      setIsProcessing(false);
      setIsSummaryLoading(false);
      setIsTtsLoading(false);
    }
  };

  // Update the estimation function to be more conservative
  const estimateDocumentTokens = (file: File) => {
    // More conservative estimation:
    // For images/PDFs: ~100 words per KB
    // For text files: ~200 characters per KB
    // 1 token ≈ 4 characters
    const tokensPerKB = file.name.toLowerCase().endsWith(".txt") ? 50 : 25;
    return Math.ceil((file.size / 1024) * tokensPerKB); // size in KB * tokens per KB
  };

  // Update cost calculations
  const transcriptionCost = selectedFile
    ? Math.ceil(
        estimateCosts({
          textLength: estimateDocumentTokens(selectedFile),
        }).total
      )
    : 0;

  const speechCost = selectedFile
    ? Math.ceil(
        estimateCosts({
          ...(mode === "summary"
            ? {
                // For summary mode: original text cost + 20% for summary
                textLength: estimateDocumentTokens(selectedFile),
                summaryLength: Math.ceil(
                  estimateDocumentTokens(selectedFile) * 0.2
                ),
              }
            : {
                // For full text mode: just the text length
                textLength: estimateDocumentTokens(selectedFile),
              }),
        }).total
      )
    : 0;

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-center">Document Converter</h1>
        <p className="text-muted-foreground text-center">
          Convert your documents to speech
        </p>

        <div className="flex justify-center">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            size="lg"
            className="w-48 inline-flex items-center px-2"
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
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Document Ready: {selectedFile.name}
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <CostButton
                onClick={transcribe}
                disabled={Boolean(isProcessing || result?.text)}
                isLoading={isProcessing}
                cost={transcriptionCost}
              >
                Transcribe Document
              </CostButton>

              <div className="flex flex-col gap-4">
                <Select
                  value={mode}
                  onValueChange={(value) =>
                    setMode(value as "full" | "summary")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Text Speech</SelectItem>
                    <SelectItem value="summary">Summarized Speech</SelectItem>
                  </SelectContent>
                </Select>

                <CostButton
                  onClick={handleGenerateSpeech}
                  disabled={Boolean(
                    !selectedFile ||
                      (mode === "full" && fullTextAudioUrl) ||
                      (mode === "summary" && result?.summary && summaryAudioUrl)
                  )}
                  isLoading={isProcessing || isSummaryLoading || isTtsLoading}
                  cost={speechCost}
                >
                  Generate {mode === "full" ? "Full Text" : "Summary"} Speech
                </CostButton>
              </div>
            </div>

            {result?.text && (
              <div className="space-y-2">
                <h3 className="font-semibold">Document Text</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {result.text}
                </p>
                {fullTextAudioUrl && (
                  <div className="rounded-lg border bg-card p-4 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Full Text Audio
                      </h4>
                      <Button
                        onClick={() => window.open(fullTextAudioUrl)}
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
                <h3 className="font-semibold">Summary</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {result.summary}
                </p>
                {summaryAudioUrl && (
                  <div className="rounded-lg border bg-card p-4 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Summary Audio
                      </h4>
                      <Button
                        onClick={() => window.open(summaryAudioUrl)}
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
    </div>
  );
}
