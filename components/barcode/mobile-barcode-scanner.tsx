"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2, X, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileBarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

const SCAN_TIMEOUT_MS = 60_000;

const ALLOWED_FORMAT_NAMES = new Set([
  "EAN_13",
  "EAN_8",
  "UPC_A",
  "UPC_E",
  "CODE_128",
]);

function vibrateOnSuccess() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(120);
  }
}

function resolveFormatName(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    const enumNames = [
      "QR_CODE",
      "AZTEC",
      "CODABAR",
      "CODE_39",
      "CODE_93",
      "CODE_128",
      "DATA_MATRIX",
      "MAXICODE",
      "ITF",
      "EAN_13",
      "EAN_8",
      "PDF_417",
      "RSS_14",
      "RSS_EXPANDED",
      "UPC_A",
      "UPC_E",
      "UPC_EAN_EXTENSION",
    ];
    return enumNames[value];
  }
  return undefined;
}

function getDecodedFormatName(decodedResult: {
  result?: { format?: { formatName?: unknown; format?: unknown } };
}): string | undefined {
  const format = decodedResult?.result?.format;
  if (!format) return undefined;
  return (
    resolveFormatName(format.formatName) ?? resolveFormatName(format.format)
  );
}

function isAllowedBarcode(code: string, formatName?: string): boolean {
  const trimmed = code.trim();
  if (!trimmed || trimmed.length < 4) return false;

  if (formatName) {
    return ALLOWED_FORMAT_NAMES.has(formatName);
  }

  if (/^\d{12,13}$/.test(trimmed)) return true;
  if (/^[\x20-\x7E]{4,48}$/.test(trimmed)) return true;

  return false;
}

export function MobileBarcodeScanner({
  open,
  onClose,
  onScan,
}: MobileBarcodeScannerProps) {
  const containerId = useId().replace(/:/g, "");
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const handledRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);

  const stopScanner = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        // Camera may already be stopped.
      }
    }
  }, []);

  const handleClose = useCallback(async () => {
    handledRef.current = false;
    setSuccess(false);
    setError(null);
    setLoading(true);
    await stopScanner();
    onClose();
  }, [onClose, stopScanner]);

  const handleScanSuccess = useCallback(
    async (decodedText: string, formatName?: string) => {
      if (handledRef.current) return;

      if (!isAllowedBarcode(decodedText, formatName)) {
        return;
      }

      handledRef.current = true;
      vibrateOnSuccess();
      setSuccess(true);

      await stopScanner();

      window.setTimeout(() => {
        onScan(decodedText.trim());
        onClose();
        setSuccess(false);
        setLoading(true);
        handledRef.current = false;
      }, 450);
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
    setLoading(true);
    setError(null);
    setSuccess(false);

    async function startScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
          "html5-qrcode"
        );

        if (cancelled) return;

        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.CODE_128,
          ],
          verbose: false,
        });

        scannerRef.current = scanner;

        const viewfinderWidth = Math.min(window.innerWidth - 48, 360);
        const viewfinderHeight = Math.round(viewfinderWidth * 0.55);

        await scanner.start(
          { facingMode: { exact: "environment" } },
          {
            fps: 12,
            qrbox: { width: viewfinderWidth, height: viewfinderHeight },
            aspectRatio: 1.7777778,
            disableFlip: true,
          },
          (decodedText, decodedResult) => {
            void handleScanSuccess(
              decodedText,
              getDecodedFormatName(decodedResult)
            );
          },
          () => {
            // Scan attempt failed — keep scanning.
          }
        );

        if (cancelled) {
          await scanner.stop().catch(() => undefined);
          return;
        }

        setLoading(false);

        timeoutRef.current = setTimeout(() => {
          if (!handledRef.current) {
            void stopScanner();
            setError(
              "No barcode detected. Move closer to the label and try again."
            );
            setLoading(false);
          }
        }, SCAN_TIMEOUT_MS);
      } catch (firstError) {
        if (cancelled) return;

        try {
          const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
            "html5-qrcode"
          );

          const scanner = new Html5Qrcode(containerId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.CODE_128,
            ],
            verbose: false,
          });

          scannerRef.current = scanner;

          const viewfinderWidth = Math.min(window.innerWidth - 48, 360);
          const viewfinderHeight = Math.round(viewfinderWidth * 0.55);

          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 12,
              qrbox: { width: viewfinderWidth, height: viewfinderHeight },
              aspectRatio: 1.7777778,
              disableFlip: true,
            },
            (decodedText, decodedResult) => {
              void handleScanSuccess(
                decodedText,
                getDecodedFormatName(decodedResult)
              );
            },
            () => undefined
          );

          if (cancelled) {
            await scanner.stop().catch(() => undefined);
            return;
          }

          setLoading(false);

          timeoutRef.current = setTimeout(() => {
            if (!handledRef.current) {
              void stopScanner();
              setError(
                "No barcode detected. Move closer to the label and try again."
              );
              setLoading(false);
            }
          }, SCAN_TIMEOUT_MS);
        } catch {
          if (cancelled) return;

          const message =
            firstError instanceof Error ? firstError.message : String(firstError);

          if (
            message.toLowerCase().includes("permission") ||
            message.toLowerCase().includes("notallowed")
          ) {
            setError(
              "Camera access denied. Allow camera permission in your browser settings, then try again."
            );
          } else if (message.toLowerCase().includes("notfound")) {
            setError(
              "No camera found on this device. Barcode scanning needs a phone with a rear camera."
            );
          } else {
            setError(
              "Could not open the camera. Use Chrome on your phone and allow camera access."
            );
          }
          setLoading(false);
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [
    open,
    mounted,
    containerId,
    handleScanSuccess,
    stopScanner,
    cameraAttempt,
  ]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Scan product barcode"
    >
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div>
          <p className="text-lg font-semibold">Scan Product</p>
          <p className="text-sm text-white/70">Point at the barcode label</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="h-12 w-12 rounded-full p-0 shrink-0"
          onClick={() => void handleClose()}
          aria-label="Close scanner"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="relative flex-1 min-h-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black">
          <div id={containerId} className="h-full w-full [&_video]:object-cover" />

          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <div
              className={cn(
                "relative w-[min(92vw,360px)] aspect-[16/10] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]",
                success && "border-emerald-400"
              )}
            >
              <div className="absolute left-3 top-3 h-8 w-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
              <div className="absolute right-3 top-3 h-8 w-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
              <div className="absolute left-3 bottom-3 h-8 w-8 border-l-4 border-b-4 border-white rounded-bl-lg" />
              <div className="absolute right-3 bottom-3 h-8 w-8 border-r-4 border-b-4 border-white rounded-br-lg" />
              {!success && !loading && !error && (
                <div className="absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80 animate-pulse" />
              )}
            </div>
          </div>

          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <Loader2 className="h-10 w-10 animate-spin text-white" />
              <p className="text-sm text-white/80">Starting camera…</p>
            </div>
          )}

          {success && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-emerald-600/80 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="h-16 w-16 text-white" />
              <p className="text-lg font-semibold">Barcode scanned</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center">
              <AlertCircle className="h-12 w-12 text-amber-400" />
              <p className="text-base text-white/90">{error}</p>
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
      </div>

      <p className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-white/60">
        EAN-13 · UPC · Code 128 only
      </p>
    </div>,
    document.body
  );
}
