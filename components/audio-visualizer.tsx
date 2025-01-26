"use client";

import { useRef, useEffect } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
}

export function AudioVisualizer({ isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

          analyser.fftSize = 256;
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

      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawFrame = () => {
        animationFrameRef.current = requestAnimationFrame(drawFrame);
        analyser.getByteTimeDomainData(dataArray);

        ctx.fillStyle = "rgb(14, 16, 20)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgb(99, 102, 241)";
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
    <canvas
      ref={canvasRef}
      className="w-full h-32 rounded-lg bg-background"
      width={600}
      height={128}
    />
  );
}
