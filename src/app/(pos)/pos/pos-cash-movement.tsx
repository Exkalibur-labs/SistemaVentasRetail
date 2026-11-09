"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Modal } from "./pos-parts";

export type CashMovementProps = {
  sessionId: string;
  currency: string;
  onClose: () => void;
  onSuccess: (text: string) => void;
};

const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000];

const DEPOSIT_REASONS = ["Fondo adicional", "Cambio de morralla", "Aportación de dueño", "Ajuste de caja"];
const WITHDRAWAL_REASONS = ["Pago a proveedor menor", "Compra de hielo / garrafón", "Gasto de limpieza", "Retiro a caja fuerte", "Gasto menor"];

export function PosCashMovementModal({ sessionId, currency, onClose, onSuccess }: CashMovementProps) {
  const [kind, setKind] = useState<"deposit" | "withdrawal">("withdrawal");
  const [amountStr, setAmountStr] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) {
      setError("Ingresa un importe válido mayor a cero.");
      return;
    }
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setError("Ingresa o selecciona un motivo.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/pos/cash-movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashSessionId: sessionId,
          kind,
          amount: Math.round(val * 100), // En centavos
          reason: cleanReason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || "Error al registrar movimiento");
      }

      const label = kind === "deposit" ? "Entrada" : "Salida";
      onSuccess(`${label} de $${val.toFixed(2)} ${currency} registrada correctamente.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Movimiento de Caja (Entrada / Salida)" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {/* Selector de Tipo (Entrada / Salida) con botones táctiles grandes */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setKind("deposit"); setError(null); }}
            className={`flex items-center justify-center gap-2 rounded-lg p-3 font-semibold transition ${
              kind === "deposit"
                ? "bg-success text-white shadow"
                : "border border-border bg-surface-2 text-muted hover:text-text"
            }`}
          >
            <ArrowDownLeft className="size-5" /> Entrada de Efectivo
          </button>
          <button
            type="button"
            onClick={() => { setKind("withdrawal"); setError(null); }}
            className={`flex items-center justify-center gap-2 rounded-lg p-3 font-semibold transition ${
              kind === "withdrawal"
                ? "bg-danger text-white shadow"
                : "border border-border bg-surface-2 text-muted hover:text-text"
            }`}
          >
            <ArrowUpRight className="size-5" /> Salida / Retiro
          </button>
        </div>

        {/* Montos rápidos */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Montos rápidos:</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmountStr(String(amt))}
                className="rounded-md border border-border bg-surface py-2 text-center font-medium hover:bg-border active:scale-95"
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Campo de Importe */}
        <div>
          <label className="mb-1 block font-medium">
            Importe ({currency}) <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-3 text-lg font-bold text-muted">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              autoFocus
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="field !min-h-12 w-full pl-8 text-xl font-bold"
              required
            />
          </div>
        </div>

        {/* Motivos rápidos */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Motivos frecuentes:</label>
          <div className="flex flex-wrap gap-1.5">
            {(kind === "deposit" ? DEPOSIT_REASONS : WITHDRAWAL_REASONS).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  reason === r
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-border bg-surface text-muted hover:border-text"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Campo de Motivo */}
        <div>
          <label className="mb-1 block font-medium">
            Motivo / Concepto <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={kind === "deposit" ? "Ej. Cambio de billetes" : "Ej. Pago a repartidor de refrescos"}
            className="field w-full"
            required
          />
        </div>

        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger">
            {error}
          </div>
        )}

        {/* Botones de acción */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border bg-surface-2 py-3 font-medium text-muted hover:bg-border"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 rounded-lg py-3 font-semibold text-white transition disabled:opacity-50 ${
              kind === "deposit" ? "bg-success hover:opacity-90" : "bg-danger hover:opacity-90"
            }`}
          >
            {submitting ? "Registrando…" : kind === "deposit" ? "Registrar Entrada" : "Registrar Salida"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
