"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  X,
  Camera,
  AlertCircle,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatBarcodeType,
  validateScannedBarcode,
  ZXING_RETAIL_FORMATS,
} from "@/lib/barcode";

type ScannerControls = { stop: () => void };

export interface MobileBarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

type ScanDebugInfo = {
  raw: string;
  normalized: string;
  format: string;
  camera: string;
  confidence: string;
  frames: number;
  valid: boolean;
  reason?: string;
};

const DUPLICATE_DEBOUNCE_MS = 1800;

function vibrateOnSuccess() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([80, 40, 80]);
  }
}

async function pickRearCameraId(
  listDevices: () => Promise<MediaDeviceInfo[]>
): Promise<{ deviceId: string | undefined; label: string }> {
  const devices = await listDevices();
  if (!devices.length) {
    throw new Error("No camera found on this device.");
  }

  const rear = devices.find((device) =>
    /back|rear|environment|trás|arrière|camera2 0/i.test(device.label)
  );

  const selected = rear ?? devices[devices.length - 1];
  return {
    deviceId: selected.deviceId || undefined,
    label: selected.label || "Rear camera",
  };
}

async function applyCameraEnhancements(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  if (!track) return;

  const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & {
    torch?: boolean;
    exposureMode?: string[];
    focusMode?: string[];
  };

  const advanced: Record<string, unknown>[] = [];

  if (capabilities?.focusMode?.includes("continuous")) {
    advanced.push({ focusMode: "continuous" });
  }
  if (capabilities?.exposureMode?.includes("continuous")) {
    advanced.push({ exposureMode: "continuous" });
  }
  if (capabilities?.torch) {
    advanced.push({ exposureCompensation: 1 });
  }

  if (advanced.length > 0) {
    try {
      await track.applyConstraints({ advanced } as MediaTrackConstraints);
    } catch {
      // Optional enhancements — ignore if unsupported.
    }
  }
}

export function MobileBarcodeScanner({
  open,
  onClose,
  onScan,
}: MobileBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<import("@zxing/browser").BrowserMultiFormatReader | null>(
    null
  );
  const controlsRef = useRef<ScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handledRef = useRef(false);
  const frameCountRef = useRef(0);
  const lastDuplicateRef = useRef<{ code: string; at: number } | null>(null);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<ScanDebugInfo | null>(null);
  const [cameraLabel, setCameraLabel] = useState("");

  const stopScanner = useCallback(async () => {
    handledRef.current = false;
    frameCountRef.current = 0;
    setTorchOn(false);
    setTorchSupported(false);

    try {
      controlsRef.current?.stop();
    } catch {
      // Controls may already be stopped.
    }
    controlsRef.current = null;

    readerRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (videoRef.current) {
        const { BrowserCodeReader } = await import("@zxing/browser");
        BrowserCodeReader.cleanVideoSource(videoRef.current);
      }
      const { BrowserCodeReader } = await import("@zxing/browser");
      BrowserCodeReader.releaseAllStreams();
    } catch {
      // Cleanup best-effort.
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleClose = useCallback(async () => {
    setSuccess(false);
    setError(null);
    setLoading(true);
    setDebugInfo(null);
    await stopScanner();
    onClose();
  }, [onClose, stopScanner]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;

    const next = !torchOn;
    try {
      const { BrowserCodeReader } = await import("@zxing/browser");
      await BrowserCodeReader.mediaStreamSetTorch(track, next);
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  const acceptScan = useCallback(
    async (raw: string, format: unknown, camera: string) => {
      if (handledRef.current) return;

      const validation = validateScannedBarcode(raw, format);
      const formatLabel = formatBarcodeType(format);

      setDebugInfo({
        raw,
        normalized: validation.normalized,
        format: formatLabel,
        camera,
        confidence: validation.valid ? "Checksum OK" : "Rejected",
        frames: frameCountRef.current,
        valid: validation.valid,
        reason: validation.reason,
      });

      if (!validation.valid) return;

      const now = Date.now();
      const last = lastDuplicateRef.current;
      if (
        last &&
        last.code === validation.normalized &&
        now - last.at < DUPLICATE_DEBOUNCE_MS
      ) {
        return;
      }
      lastDuplicateRef.current = { code: validation.normalized, at: now };

      handledRef.current = true;
      vibrateOnSuccess();
      setSuccess(true);
      await stopScanner();

      window.setTimeout(() => {
        onScan(validation.normalized);
        onClose();
        setSuccess(false);
        setLoading(true);
        handledRef.current = false;
      }, 500);
    },
    [onClose, onScan, stopScanner]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;

    let cancelled = false;
    handledRef.current = false;
    frameCountRef.current = 0;
    lastDuplicateRef.current = null;
    setLoading(true);
    setError(null);
    setSuccess(false);
    setDebugInfo(null);

    async function startScanner() {
      try {
        const { BrowserMultiFormatReader, BrowserCodeReader } = await import(
          "@zxing/browser"
        );
        const { DecodeHintType } = await import("@zxing/library");

        if (cancelled || !videoRef.current) return;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_RETAIL_FORMATS);
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.ASSUME_GS1, true);

        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 80,
          delayBetweenScanSuccess: DUPLICATE_DEBOUNCE_MS,
        });
        readerRef.current = reader;

        const { deviceId, label } = await pickRearCameraId(() =>
          BrowserCodeReader.listVideoInputDevices()
        );
        setCameraLabel(label);

        const videoConstraints: MediaTrackConstraints = {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: { ideal: "environment" },
          width: { min: 640, ideal: 1920, max: 3840 },
          height: { min: 480, ideal: 1080, max: 2160 },
          frameRate: { ideal: 30, min: 15 },
        };

        const controls = await reader.decodeFromConstraints(
          { video: videoConstraints },
          videoRef.current,
          (result) => {
            frameCountRef.current += 1;

            const stream = videoRef.current?.srcObject;
            if (stream instanceof MediaStream) {
              streamRef.current = stream;
            }

            if (result && !handledRef.current) {
              void acceptScan(
                result.getText(),
                result.getBarcodeFormat(),
                label
              );
            }
          }
        );

        controlsRef.current = controls;

        const stream = videoRef.current.srcObject;
        if (stream instanceof MediaStream) {
          streamRef.current = stream;
          await applyCameraEnhancements(stream);
          const track = stream.getVideoTracks()[0];
          if (track) {
            setTorchSupported(
              BrowserCodeReader.mediaStreamIsTorchCompatibleTrack(track)
            );
          }
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;

        const message = err instanceof Error ? err.message : String(err);
        const lower = message.toLowerCase();

        if (lower.includes("permission") || lower.includes("notallowed")) {
          setError(
            "Camera access denied. Open browser settings, allow camera for this site, then try again."
          );
        } else if (lower.includes("notfound") || lower.includes("no camera")) {
          setError(
            "No rear camera found. Barcode scanning needs a phone with a back camera."
          );
        } else {
          setError(
            "Could not start the camera. Use Chrome on Android and hold the phone steady on the barcode."
          );
        }
        setLoading(false);
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [open, mounted, cameraAttempt, acceptScan, stopScanner]);

  if (!mounted || !open) return null;

  const scanBoxWidth = "min(80vw, 100%)";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Scan product barcode"
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold">Scan Product</p>
          <p className="text-sm text-white/70 truncate">
            Align the barcode inside the box
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {torchSupported && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-12 w-12 rounded-full p-0"
              onClick={() => void toggleTorch()}
              aria-label={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
            >
              {torchOn ? (
                <FlashlightOff className="h-5 w-5" />
              ) : (
                <Flashlight className="h-5 w-5" />
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="h-12 w-12 rounded-full p-0"
            onClick={() => setShowDebug((value) => !value)}
            aria-label="Toggle debug info"
          >
            <Bug className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="h-12 w-12 rounded-full p-0"
            onClick={() => void handleClose()}
            aria-label="Close scanner"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />

        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div
            className={cn(
              "relative rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]",
              success && "border-emerald-400"
            )}
            style={{
              width: scanBoxWidth,
              height: "28vh",
              minHeight: "140px",
              maxHeight: "220px",
            }}
          >
            <div className="absolute left-2 top-2 h-10 w-10 border-l-4 border-t-4 border-white rounded-tl-xl" />
            <div className="absolute right-2 top-2 h-10 w-10 border-r-4 border-t-4 border-white rounded-tr-xl" />
            <div className="absolute left-2 bottom-2 h-10 w-10 border-l-4 border-b-4 border-white rounded-bl-xl" />
            <div className="absolute right-2 bottom-2 h-10 w-10 border-r-4 border-b-4 border-white rounded-br-xl" />
            {!success && !loading && !error && (
              <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 bg-red-500 animate-pulse" />
            )}
          </div>
        </div>

        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
            <p className="text-sm text-white/80">Starting rear camera…</p>
          </div>
        )}

        {success && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-emerald-600/85 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="h-20 w-20 text-white" />
            <p className="text-xl font-semibold">Barcode scanned</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-400" />
            <p className="text-base text-white/90 max-w-sm">{error}</p>
            <div className="flex w-full max-w-sm flex-col gap-3">
              <Button
                type="button"
                size="lg"
                className="h-12 w-full"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  handledRef.current = false;
                  setCameraAttempt((value) => value + 1);
                }}
              >
                <Camera className="h-5 w-5" />
                Try again
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="h-12 w-full"
                onClick={() => void handleClose()}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
        <p className="text-center text-xs text-white/70">
          EAN-13 · EAN-8 · UPC · Code 128 — keep barcode flat and well lit
        </p>

        {(showDebug || debugInfo) && (
          <div className="rounded-xl bg-white/10 p-3 text-xs font-mono space-y-1 text-white/90">
            <p className="font-semibold text-white">Debug</p>
            <p>Camera: {cameraLabel || "—"}</p>
            <p>Frames: {debugInfo?.frames ?? frameCountRef.current}</p>
            <p>Raw: {debugInfo?.raw ?? "—"}</p>
            <p>Normalized: {debugInfo?.normalized ?? "—"}</p>
            <p>Type: {debugInfo?.format ?? "—"}</p>
            <p>Confidence: {debugInfo?.confidence ?? "Scanning…"}</p>
            {debugInfo?.reason && <p>Reason: {debugInfo.reason}</p>}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
