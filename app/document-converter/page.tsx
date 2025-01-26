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

type ProcessingMode = "full" | "summary";

type AudioOutput = {
  url: string;
  type: ProcessingMode;
};

export default function DocumentConverter() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioOutputs, setAudioOutputs] = useState<AudioOutput[]>([]);
  const [text, setText] = useState<string | null>(null);
  const [mode, setMode] = useState<ProcessingMode>("full");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setText(null);
    setAudioOutputs([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "full"); // Always get full text first

      const response = await fetch("/api/process-document", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process document");
      }

      const data = await response.json();
      setText(data.text);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Error uploading file. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSpeech = async () => {
    if (!text) return;

    // Log estimated cost
    const estimatedCost = Math.ceil(
      estimateCosts({
        textLength: text.length,
        summaryLength: mode === "summary" ? text.length * 0.2 : text.length,
      }).total
    );
    console.log("Estimated cost:", estimatedCost);

    setIsProcessing(true);
    try {
      let finalText = text;
      if (mode === "summary") {
        const summaryResponse = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        const summaryData = await summaryResponse.json();
        if (!summaryResponse.ok) {
          if (summaryResponse.status === 402) {
            alert(
              `Insufficient credits.\nCost: ${Math.ceil(summaryData.required)} credits\nAvailable: ${Math.floor(summaryData.available)} credits`
            );
          } else {
            throw new Error(
              summaryData.details || "Failed to generate summary"
            );
          }
          return;
        }
        finalText = summaryData.summary;
        console.log("Summary cost:", Math.ceil(summaryData.cost));
      }

      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: finalText,
          voice: "alloy",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 402) {
          alert(
            `Insufficient credits.\nCost: ${Math.ceil(data.required)} credits\nAvailable: ${Math.floor(data.available)} credits`
          );
        } else {
          throw new Error(data.details || "Failed to generate speech");
        }
        return;
      }
      console.log("TTS cost:", Math.ceil(data.cost));

      setAudioOutputs((prev) => [...prev, { url: data.audioUrl, type: mode }]);
      creditsEvent.emit();
    } catch (err: any) {
      console.error("Speech generation error:", err);
      alert(err.message || "Error generating speech. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const hasAllAudioTypes = audioOutputs.length === 2;

  const speechCost = text
    ? Math.ceil(
        estimateCosts({
          ...(mode === "summary"
            ? {
                textLength: text.length,
                summaryLength: Math.ceil(text.length * 0.2),
              }
            : {
                summaryLength: text.length,
              }),
        }).total
      )
    : 0;

  console.log("Document Converter:", {
    mode,
    textLength: text?.length,
    cost: speechCost,
  });

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-center">Document Converter</h1>
        <p className="text-muted-foreground text-center">
          Convert your documents to audio with optional summarization
        </p>

        <div className="flex justify-center">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            size="lg"
            className="w-full max-w-xs"
          >
            <Upload className="mr-2 h-4 w-4" />
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

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {audioOutputs.length > 0
              ? "Generating speech..."
              : "Processing document..."}
          </div>
        )}

        {text && (
          <div className="space-y-4 mt-8">
            <div className="space-y-2">
              <h3 className="font-semibold">Extracted Text</h3>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg animate-fade-in">
                {text}
              </p>
            </div>

            {/* Speech controls - visible until both types are generated */}
            {!hasAllAudioTypes && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Select
                    value={mode}
                    onValueChange={(value) => setMode(value as ProcessingMode)}
                    disabled={isProcessing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose speech mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Text to Speech</SelectItem>
                      <SelectItem value="summary">Summarized Speech</SelectItem>
                    </SelectContent>
                  </Select>

                  <CostButton
                    onClick={handleGenerateSpeech}
                    disabled={isProcessing}
                    isLoading={isProcessing}
                    cost={speechCost}
                    className="flex-1"
                  >
                    Generate Speech
                  </CostButton>
                </div>
              </div>
            )}

            {/* Audio outputs */}
            {audioOutputs.length > 0 && (
              <div className="space-y-4">
                {audioOutputs.map((audio, index) => (
                  <div key={index} className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {audio.type === "full"
                          ? "Full Text Audio"
                          : "Summary Audio"}
                      </h4>
                      <Button
                        onClick={() => window.open(audio.url)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <AudioPlayer
                      src={audio.url}
                      onError={() =>
                        alert(
                          "Error loading audio. The link might have expired. Please try again."
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
