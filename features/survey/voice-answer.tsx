"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Record an answer, or attach one already recorded.
 *
 * Both paths matter. Recording in the browser is fastest for someone sitting
 * with the page open; attaching a file is for the far more common habit of
 * recording a voice note the way you always do and sending that.
 *
 * Recording needs a microphone permission prompt, which some people will
 * decline — so the file input is always visible rather than hidden behind a
 * failure.
 */
export function VoiceAnswer({
  questionId,
  onChange,
  disabled,
}: {
  questionId: string;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState<{ url: string; file: File } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  // Release the stream and the object URL on unmount, or the microphone
  // indicator stays on after the page is gone.
  useEffect(() => {
    return () => {
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (clip) URL.revokeObjectURL(clip.url);
    };
  }, [clip]);

  async function start() {
    setError(null);
    if (typeof MediaRecorder === "undefined") {
      setError("This browser cannot record. You can attach a voice note instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const file = new File([blob], `${questionId}.webm`, { type });
        const url = URL.createObjectURL(blob);
        setClip({ url, file });
        onChange(file);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(
        () => setSeconds((s) => s + 1),
        1000
      );
    } catch {
      setError(
        "Microphone was blocked. You can attach a voice note from your phone instead."
      );
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  }

  function clear() {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    setSeconds(0);
    onChange(null);
  }

  function attach(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    if (clip) URL.revokeObjectURL(clip.url);
    const url = URL.createObjectURL(file);
    setClip({ url, file });
    onChange(file);
  }

  if (clip) {
    return (
      <div className="rounded-lg border border-border bg-secondary/50 p-3">
        <audio
          controls
          src={clip.url}
          className="w-full"
          aria-label="Your recorded answer"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={disabled}
          className="mt-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Remove recording
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Full size, not sm. This is the primary control for anyone who finds
            typing hard — the people this whole feature exists for — so it must
            not be the smallest target on the page. */}
        <Button
          type="button"
          variant={recording ? "destructive" : "outline"}
          onClick={recording ? stop : start}
          disabled={disabled}
          className="min-h-11 touch-manipulation"
        >
          {recording ? (
            <>
              <Square className="h-4 w-4" />
              Stop · {Math.floor(seconds / 60)}:
              {String(seconds % 60).padStart(2, "0")}
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Record answer
            </>
          )}
        </Button>

        <label
          className={cn(
            "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-ring",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <Upload className="h-4 w-4" />
          Attach a voice note
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={attach}
            disabled={disabled}
          />
        </label>
      </div>

      {recording && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-destructive motion-reduce:animate-none" />
          Recording — speak in whichever language is easiest.
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
