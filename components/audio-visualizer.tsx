"use client";

import { useRef, useEffect } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
}

export function AudioVisualizer({ isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gradientRef = useRef<CanvasGradient | null>(null);

  useEffect(() => {
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let mediaStream: MediaStream;

    const initializeAudio = async () => {
      if (isRecording) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          audioContext = new AudioContext();
          analyser = audioContext.createAnalyser();

          const source = audioContext.createMediaStreamSource(mediaStream);
          source.connect(analyser);

          // Increase the FFT size for smoother visualization
          analyser.fftSize = 1024;
          // Reduce smoothing for more responsive visualization
          analyser.smoothingTimeConstant = 0.5;
          analyserRef.current = analyser;

          draw();
        } catch (error) {
          console.error("Error initializing audio:", error);
        }
      }
    };

    const draw = () => {
      if (!canvasRef.current || !analyserRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Create gradient if not exists
      if (!gradientRef.current) {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, "rgba(147, 51, 234, 0.9)"); // Purple
        gradient.addColorStop(0.5, "rgba(79, 70, 229, 0.9)"); // Indigo
        gradient.addColorStop(1, "rgba(59, 130, 246, 0.9)"); // Blue
        gradientRef.current = gradient;
      }

      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawFrame = () => {
        animationFrameRef.current = requestAnimationFrame(drawFrame);
        analyser.getByteTimeDomainData(dataArray);

        // Clear the entire canvas each frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the recorder-like background
        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, "rgba(14, 16, 20, 0.95)");
        bgGradient.addColorStop(0.5, "rgba(14, 16, 20, 0.98)");
        bgGradient.addColorStop(1, "rgba(14, 16, 20, 0.95)");
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;

        // Vertical grid lines
        for (let x = 0; x < canvas.width; x += 30) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        // Horizontal grid lines
        for (let y = 0; y < canvas.height; y += 30) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Draw center line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        // Draw the waveform
        ctx.lineWidth = 3;
        ctx.strokeStyle = gradientRef.current!;
        ctx.beginPath();

        const sliceWidth = (canvas.width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        // Add a subtle glow effect to the waveform
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(147, 51, 234, 0.3)";
      };

      drawFrame();
    };

    if (isRecording) {
      initializeAudio();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isRecording]);

  return (
    <div className="relative w-full">
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-blue-500/5" />
      <canvas
        ref={canvasRef}
        className="relative w-full h-32 rounded-lg bg-background/90 backdrop-blur-sm"
        width={600}
        height={128}
      />
    </div>
  );
}
