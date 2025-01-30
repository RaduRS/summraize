"use client";

import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  onError?: () => void;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
  className?: string;
  initialDuration?: number;
}

export function AudioPlayer({
  src,
  onError,
  onLoadedMetadata,
  className,
  initialDuration,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => {
      if (
        audio.duration &&
        !isNaN(audio.duration) &&
        isFinite(audio.duration)
      ) {
        setDuration(audio.duration);
      } else if (initialDuration) {
        setDuration(initialDuration);
      }
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.error("Audio playback error:", e);
      setIsPlaying(false);
      if (onError) onError();
    };

    // Add event listeners
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("play", () => setIsPlaying(true));

    // Set initial duration if provided
    if (initialDuration) {
      setDuration(initialDuration);
    }

    // iOS specific setup
    audio.load();

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("pause", () => setIsPlaying(false));
      audio.removeEventListener("play", () => setIsPlaying(true));
    };
  }, [initialDuration, onError, src]);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // For iOS, we need to load the audio first
        audioRef.current.load();
        await audioRef.current.play();
      }
    } catch (error) {
      console.error("Playback error:", error);
      setIsPlaying(false);
      if (onError) {
        onError();
      }
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (!audioRef.current) return;
    try {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    } catch (error) {
      console.error("Error setting audio time:", error);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    try {
      const audio = e.target as HTMLAudioElement;
      if (
        audio.duration &&
        !isNaN(audio.duration) &&
        isFinite(audio.duration)
      ) {
        setDuration(audio.duration);
      } else if (initialDuration) {
        setDuration(initialDuration);
      }
      onLoadedMetadata?.(e);
    } catch (error) {
      console.error("Error handling metadata:", error);
      if (initialDuration) {
        setDuration(initialDuration);
      }
    }
  };

  return (
    <div className="flex items-center gap-4">
      <audio
        ref={audioRef}
        src={src}
        onError={(e) => {
          console.error("Audio element error:", e);
          setIsPlaying(false);
          onError?.();
        }}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        playsInline // Important for iOS
        preload="auto" // Preload audio data
      />

      <Button
        onClick={togglePlayPause}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-sm text-muted-foreground min-w-[40px]">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={[currentTime]}
          max={duration}
          step={0.1}
          onValueChange={handleSliderChange}
          className="flex-1"
        />
        <span className="text-sm text-muted-foreground min-w-[40px]">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
