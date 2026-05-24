"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import { Mic, CircleStop, Loader2, AlertTriangle } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type RecorderState = "idle" | "recording" | "uploading" | "error";

interface InputWithAudioRecorderProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function InputWithAudioRecorder({
  value,
  onChange,
  placeholder,
  className,
  id,
  multiline = false,
  maxLength,
  autoFocus,
}: InputWithAudioRecorderProps) {
  const { t } = useTranslation();
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Cleanup ────────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setElapsed(0);
  }, []);

  // ── Start Recording ────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setErrorMessage("");
    setRecorderState("idle"); // reset before attempting

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(t.createTask.audio.errorPermission);
      setRecorderState("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        // Stop the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setRecorderState("uploading");

        try {
          const formData = new FormData();
          formData.append("file", blob, "recording.webm");

          const res = await fetch("/api/audio/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            if (res.status === 401) {
              toast.error("Session expired");
            } else {
              toast.error(errData.error || "Transcription failed");
            }
            setErrorMessage(errData.error || t.createTask.audio.errorTranscription);
            setRecorderState("error");
            return;
          }

          const data = await res.json();

          if (!data.text || data.text.trim().length === 0) {
            toast.error("No speech detected");
            setRecorderState("idle");
            setElapsed(0);
            return;
          }

          const separator = value && !value.endsWith(" ") ? " " : "";
          const newValue = value + separator + data.text.trim();
          onChange(maxLength ? newValue.slice(0, maxLength) : newValue);

          setRecorderState("idle");
          setElapsed(0);
        } catch {
          setErrorMessage(t.createTask.audio.errorTranscription);
          setRecorderState("error");
        }
      };

      recorder.start();
      setRecorderState("recording");

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch {
      setErrorMessage(t.createTask.audio.errorPermission);
      setRecorderState("error");
    }
  }, [value, onChange, maxLength, t]);

  // ── Stop Recording ─────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ── Retry / Dismiss Error ──────────────────────────────────────────────────

  const dismissError = useCallback(() => {
    cleanup();
    setRecorderState("idle");
    setErrorMessage("");
  }, [cleanup]);

  // ── Format elapsed ─────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderButtonContent = () => {
    switch (recorderState) {
      case "recording":
        return (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-600 transition-colors shrink-0"
                  aria-label="Stop recording"
                >
                  {/* Pulsing red dot */}
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-muted-foreground min-w-[32px]">
                    {formatTime(elapsed)}
                  </span>
                  <CircleStop className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{t.createTask.audio.recording}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

      case "uploading":
        return (
          <Loader2 className="h-4 w-4 text-[oklch(0.55_0.15_160)] animate-spin" />
        );

      case "error":
        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip defaultOpen>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={dismissError}
                  className="text-amber-500 hover:text-amber-600 transition-colors shrink-0"
                  aria-label="Dismiss error"
                >
                  <AlertTriangle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs max-w-[200px]">{errorMessage}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

      case "idle":
      default:
        return (
          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={startRecording}
                  className="text-muted-foreground/50 hover:text-[oklch(0.55_0.15_160)] transition-colors shrink-0"
                  aria-label="Start recording"
                >
                  <Mic className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{t.createTask.audio.listening}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const buttonPositionClass = multiline
    ? "right-2 top-2"
    : "right-2 top-1/2 -translate-y-1/2";

  if (multiline) {
    return (
      <div className="relative">
        <Textarea
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            const newValue = e.target.value;
            onChange(maxLength ? newValue.slice(0, maxLength) : newValue);
          }}
          className={cn("pr-10", className)}
        />
        <div className={cn("absolute flex items-center", buttonPositionClass)}>
          {renderButtonContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          onChange(maxLength ? newValue.slice(0, maxLength) : newValue);
        }}
        className={cn("pr-10", className)}
        autoFocus={autoFocus}
        maxLength={maxLength}
      />
      <div className={cn("absolute flex items-center", buttonPositionClass)}>
        {renderButtonContent()}
      </div>
    </div>
  );
}
