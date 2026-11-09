"use client";

import { useState } from "react";
import type { TicketData } from "@/components/pos/ticket";
import { buildTicketEscPos, printViaWebBluetooth } from "@/lib/hardware/bluetooth-printer";
import { formatCents, formatQty } from "@/lib/money";

export function PrintToolbar({
  ticket,
  initialWidth = "80mm",
  onWidthChange,
}: {
  ticket: TicketData;
  initialWidth?: "58mm" | "80mm";
  onWidthChange?: (w: "58mm" | "80mm") => void;
}) {
  const [width, setWidth] = useState<"58mm" | "80mm">(initialWidth);
  const [btStatus, setBtStatus] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const handleWidth = (w: "58mm" | "80mm") => {
    setWidth(w);
    onWidthChange?.(w);
  };

  const handleBluetoothPrint = async () => {
    setPrinting(true);
    setBtStatus("Conectando con impresora Bluetooth…");

    const money = (c: number) => formatCents(c, ticket.currency);
    const when = new Intl.DateTimeFormat("es-MX", {
      timeZone: ticket.timezone,
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(ticket.soldAt));

    const escPosData = {
      companyName: ticket.company.tradeName,
      branchName: ticket.branch.name,
      rfc: ticket.company.taxId ?? undefined,
      phone: ticket.branch.phone ?? undefined,
      folio: ticket.folio ?? "PENDIENTE",
      date: when,
      cashier: ticket.sellerName,
      customer: ticket.customerName ?? undefined,
      items: ticket.lines.map((l) => ({
        name: l.description,
        qty: formatQty(l.quantity),
        price: money(l.unitPrice),
        total: money(l.total),
      })),
      subtotal: money(ticket.totals.subtotal),
      tax: money(ticket.totals.tax),
      discount: ticket.totals.discount > 0 ? money(ticket.totals.discount) : undefined,
      total: money(ticket.totals.total),
      paymentMethod: ticket.payments.map((p) => p.name).join(", ") || "Efectivo",
      received: ticket.payments[0]?.received ? money(ticket.payments[0].received) : undefined,
      change: ticket.payments[0]?.change ? money(ticket.payments[0].change) : undefined,
      footerText: ticket.company.ticketFooter ?? undefined,
    };

    const bytes = buildTicketEscPos(escPosData, width);
    const res = await printViaWebBluetooth(bytes);

    setPrinting(false);
    if (res.success) {
      setBtStatus("¡Ticket enviado a la impresora!");
      setTimeout(() => setBtStatus(null), 4000);
    } else {
      setBtStatus(`Error: ${res.error}`);
    }
  };

  return (
    <div className="mx-auto mb-4 max-w-sm rounded-lg border border-border bg-surface p-3 shadow-sm print:hidden">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-muted">Formato térmico:</span>
        <div className="inline-flex rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => handleWidth("58mm")}
            className={`rounded px-2.5 py-1 font-medium transition ${
              width === "58mm" ? "bg-primary text-primary-fg" : "text-muted hover:text-text"
            }`}
          >
            58 mm (SUZWIP)
          </button>
          <button
            type="button"
            onClick={() => handleWidth("80mm")}
            className={`rounded px-2.5 py-1 font-medium transition ${
              width === "80mm" ? "bg-primary text-primary-fg" : "text-muted hover:text-text"
            }`}
          >
            80 mm (Estándar)
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 rounded bg-surface-2 px-3 py-1.5 text-xs font-semibold hover:bg-border"
        >
          Imprimir (Navegador)
        </button>
        <button
          type="button"
          disabled={printing}
          onClick={handleBluetoothPrint}
          className="flex-1 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:opacity-90 disabled:opacity-50"
        >
          {printing ? "Enviando…" : "Bluetooth ESC/POS"}
        </button>
      </div>

      {btStatus && (
        <p className={`mt-2 text-center text-xs ${btStatus.startsWith("Error") ? "text-danger" : "text-success"}`}>
          {btStatus}
        </p>
      )}
    </div>
  );
}
