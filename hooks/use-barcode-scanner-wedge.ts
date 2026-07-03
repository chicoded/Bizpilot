"use client";

import { useEffect, useRef, useCallback } from "react";
import { looksLikeBarcode } from "@/lib/barcode-product-lookup";

const SCAN_GAP_MS = 120;
const MIN_LENGTH = 4;

interface UseBarcodeScannerWedgeOptions {
  enabled?: boolean;
  /** Desktop only (min-width 768px) when true */
  desktopOnly?: boolean;
  onScan: (barcode: string) => void;
}

function isDesktopViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 768px)").matches;
}

function isWedgeInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('[data-barcode-wedge="true"]'));
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === "TEXTAREA") return true;
  if (target.tagName === "INPUT") {
    const input = target as HTMLInputElement;
    const type = input.type || "text";
    if (["text", "search", "tel", "number"].includes(type)) {
      return !input.dataset.barcodeWedge;
    }
  }
  return false;
}

/**
 * Listens for USB / Bluetooth barcode scanners that emulate a keyboard (HID wedge).
 * Works on desktop when focus is not inside a normal text field.
 */
export function useBarcodeScannerWedge({
  enabled = true,
  desktopOnly = true,
  onScan,
}: UseBarcodeScannerWedgeOptions) {
  const bufferRef = useRef("");
  const lastKeyRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const flush = useCallback((code: string) => {
    const trimmed = code.trim();
    if (trimmed.length >= MIN_LENGTH && looksLikeBarcode(trimmed)) {
      onScanRef.current(trimmed);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (desktopOnly && !isDesktopViewport()) return;

    function onKeyDown(e: KeyboardEvent) {
      if (isWedgeInputTarget(e.target)) return;
      if (isTypingTarget(e.target)) return;

      const now = Date.now();
      if (now - lastKeyRef.current > SCAN_GAP_MS) {
        bufferRef.current = "";
      }
      lastKeyRef.current = now;

      if (e.key === "Enter") {
        if (bufferRef.current.length >= MIN_LENGTH) {
          e.preventDefault();
          flush(bufferRef.current);
        }
        bufferRef.current = "";
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, desktopOnly, flush]);
}
