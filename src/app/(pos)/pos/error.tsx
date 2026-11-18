"use client";

import { Alert, Button } from "@/components/ui";

export default function PosError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const forbidden = error.message.includes("No tienes permiso");
  return (
    <div className="mx-auto max-w-lg p-6 space-y-3">
      <Alert tone={forbidden ? "warning" : "danger"} title={forbidden ? "Sin permiso" : "Error en Punto de Venta"}>
        {forbidden ? error.message : "No se pudo cargar la caja. Intenta de nuevo o verifica tu conexión."}
        {error.digest && <span className="block text-xs text-muted">Ref. {error.digest}</span>}
      </Alert>
      {!forbidden && <Button variant="secondary" onClick={reset}>Reintentar</Button>}
    </div>
  );
}
