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
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const srcRef = useRef<string>(src);

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Add effect to handle iOS Safari source restoration
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Only update if src has changed
    if (src !== srcRef.current) {
      srcRef.current = src;
      audio.src = src;

      // For iOS Safari, ensure the source is properly set
      if (audio.paused) {
        audio.load();
      }
    }
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const newTime = audio.currentTime;
      if (!isNaN(newTime) && isFinite(newTime)) {
        setCurrentTime(newTime);
      }
    };

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

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio.currentTime !== 0) {
        audio.currentTime = 0;
      }
    };

    const handleError = (e: Event) => {
      console.error("Audio playback error:", e);
      setIsPlaying(false);
      setIsLoading(false);
      if (onError) onError();
    };

    const handlePause = () => {
      setIsPlaying(false);
      setIsLoading(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    // Add event listeners
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("playing", () => setIsLoading(false));
    audio.addEventListener("waiting", () => setIsLoading(true));
    audio.addEventListener("canplay", () => setIsLoading(false));

    // Set initial duration if provided
    if (initialDuration) {
      setDuration(initialDuration);
    }

    return () => {
      // Cleanup event listeners
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("playing", () => setIsLoading(false));
      audio.removeEventListener("waiting", () => setIsLoading(true));
      audio.removeEventListener("canplay", () => setIsLoading(false));
    };
  }, [initialDuration, onError]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      setIsLoading(true);

      // If there's an ongoing play operation, wait for it
      if (playPromiseRef.current) {
        await playPromiseRef.current;
      }

      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // For iOS, we need to handle the play promise
        playPromiseRef.current = audio.play();
        try {
          await playPromiseRef.current;
          setIsPlaying(true);
        } catch (error) {
          console.error("Play promise error:", error);
          setIsPlaying(false);
          if (onError) onError();
        } finally {
          playPromiseRef.current = null;
        }
      }
    } catch (error) {
      console.error("Playback error:", error);
      setIsPlaying(false);
      if (onError) onError();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSliderChange = async (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      setIsLoading(true);
      const wasPlaying = !audio.paused;

      // Cancel any ongoing play operation
      if (playPromiseRef.current) {
        audio.pause();
        playPromiseRef.current = null;
      }

      // Set the new time
      audio.currentTime = value[0];
      setCurrentTime(value[0]);

      // Only attempt to play if it was playing before
      if (wasPlaying) {
        try {
          // Small delay to ensure the seek is complete
          await new Promise((resolve) => setTimeout(resolve, 50));
          const playPromise = audio.play();
          playPromiseRef.current = playPromise;
          await playPromise;
          setIsPlaying(true);
        } catch (error: unknown) {
          // Ignore AbortError as it's expected when seeking rapidly
          if (error instanceof Error && error.name !== "AbortError") {
            console.error("Play after seek error:", error);
            setIsPlaying(false);
          }
        } finally {
          playPromiseRef.current = null;
        }
      }
    } catch (error) {
      console.error("Error setting audio time:", error);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
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
          setIsLoading(false);
          onError?.();
        }}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        playsInline
        preload="auto"
      />

      <Button
        onClick={togglePlayPause}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        disabled={isLoading}
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
          disabled={isLoading}
        />
        <span className="text-sm text-muted-foreground min-w-[40px]">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
