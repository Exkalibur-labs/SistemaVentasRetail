"use client";

import { useEffect, useRef, useCallback } from "react";

export type BarcodeScannerOptions = {
  /** Callback invocado cuando se detecta un código escaneado completo. */
  onScan: (barcode: string) => void;
  /** Intervalo máximo en milisegundos entre pulsaciones para considerarlo ráfaga de escáner (default 45ms). */
  maxIntervalMs?: number;
  /** Longitud mínima del código de barras (default 3 caracteres). */
  minBarcodeLength?: number;
  /** Si debe emitir un sonido 'beep' con Web Audio API tras la lectura (default true). */
  audioFeedback?: boolean;
  /** Si el hook está activo o pausado. */
  enabled?: boolean;
};

/**
 * Reproduce un tono acústico sutil usando Web Audio API.
 * Tipo beep de escáner de supermercado: 1750Hz por 60ms para éxito, tono grave para error.
 */
export function playScannerBeep(success = true) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    if (success) {
      osc.frequency.setValueAtTime(1750, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else {
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // Si el navegador bloquea audio antes de interacción, se ignora silenciosamente
  }
}

/**
 * Hook para interceptar lecturas del lector de códigos inalámbrico Znemaz 1D/2D (y compatibles).
 *
 * Los lectores tipo Keyboard Wedge emulan pulsaciones ultrarrápidas (< 40ms por tecla)
 * finalizando con un 'Enter' o 'Tab'. Este hook detecta esa firma temporal y previene
 * que la ráfaga corrompa otros campos o se pierda si el foco no está en el input.
 */
export function useBarcodeScanner({
  onScan,
  maxIntervalMs = 50,
  minBarcodeLength = 3,
  audioFeedback = true,
  enabled = true,
}: BarcodeScannerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Si ha pasado mucho tiempo desde la última tecla, reiniciamos el búfer
      if (timeDiff > maxIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      // Si se presiona Enter o Tab al final de una ráfaga
      if (e.key === "Enter" || e.key === "Tab") {
        const barcode = bufferRef.current.trim();
        if (barcode.length >= minBarcodeLength) {
          // Prevenir submit accidental de formularios
          e.preventDefault();
          e.stopPropagation();

          if (audioFeedback) {
            playScannerBeep(true);
          }

          onScanRef.current(barcode);
          bufferRef.current = "";
          return;
        }
        bufferRef.current = "";
        return;
      }

      // Capturar solo caracteres imprimibles (longitud 1)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Si el usuario está escribiendo lentamente en un textarea o input de texto normal,
        // no interferimos a menos que sea una ráfaga de escáner (< maxIntervalMs)
        const target = e.target as HTMLElement | null;
        const isInputFocused =
          target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

        // Si es input pero la velocidad es humana (> maxIntervalMs), reiniciamos búfer
        if (isInputFocused && timeDiff > maxIntervalMs && bufferRef.current.length === 0) {
          return;
        }

        bufferRef.current += e.key;
      }
    },
    [enabled, maxIntervalMs, minBarcodeLength, audioFeedback],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, handleKeyDown]);
}
