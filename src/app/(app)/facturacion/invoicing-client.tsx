"use client";

import { useState } from "react";
import { formatCents } from "@/lib/money";

function formatDateString(val: Date | string) {
  try {
    return new Date(val).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(val);
  }
}

interface InvoiceRow {
  id: string;
  folio: string;
  fiscalUuid: string;
  saleId: string | null;
  receiverRfc: string;
  receiverName: string;
  total: number;
  currency: string;
  status: "issued" | "cancelled";
  issuedAt: Date | string;
}

interface SaleCandidate {
  id: string;
  folio: string;
  customerName: string | null;
  total: number;
  soldAt: Date | string;
}

export function InvoicingClientView({
  initialInvoices,
  candidateSales,
  currency = "MXN",
}: {
  initialInvoices: InvoiceRow[];
  candidateSales: SaleCandidate[];
  currency?: string;
}) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>(initialInvoices);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(candidateSales[0]?.id || "");

  // Datos fiscales personalizados
  const [useCustomReceiver, setUseCustomReceiver] = useState(false);
  const [receiverRfc, setReceiverRfc] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverRegime, setReceiverRegime] = useState("616");
  const [receiverPostalCode, setReceiverPostalCode] = useState("91000");
  const [cfdiUse, setCfdiUse] = useState("G03");

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleId) {
      setStatusMsg({ text: "Selecciona una venta para facturar.", tone: "error" });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const payload: Record<string, unknown> = {
        action: "issue",
        saleId: selectedSaleId,
      };

      if (useCustomReceiver && receiverRfc) {
        payload.receiver = {
          rfc: receiverRfc.toUpperCase(),
          name: receiverName.toUpperCase(),
          regime: receiverRegime,
          postalCode: receiverPostalCode,
          cfdiUse,
          paymentMethod: "PUE",
          paymentForm: "01",
        };
      }

      const res = await fetch("/api/v1/invoicing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ text: data.error?.message || "Error al emitir factura.", tone: "error" });
        return;
      }

      setInvoices((prev) => [data.invoice, ...prev]);
      setStatusMsg({
        text: `✓ Factura ${data.invoice.folio} emitida exitosamente (UUID: ${data.invoice.fiscalUuid})`,
        tone: "success",
      });
      setShowIssueModal(false);
    } catch {
      setStatusMsg({ text: "Error de red al procesar la factura.", tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    const reason = prompt("Ingresa el motivo de cancelación fiscal:");
    if (!reason) return;

    setLoading(true);
    try {
      const res = await fetch("/api/v1/invoicing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", invoiceId, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ text: data.error?.message || "Error al cancelar factura.", tone: "error" });
        return;
      }

      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: "cancelled" } : inv)),
      );
      setStatusMsg({ text: "Factura cancelada correctamente ante el SAT.", tone: "success" });
    } catch {
      setStatusMsg({ text: "Error de conexión al cancelar.", tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadXml = async (id: string, folio: string) => {
    try {
      const res = await fetch(`/api/v1/invoicing?id=${id}`);
      const data = await res.json();
      if (data.ok && data.invoice?.xmlContent) {
        const blob = new Blob([data.invoice.xmlContent], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Factura_${folio}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      alert("Error al descargar XML.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra superior de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-fg">Comprobantes Fiscales Digitales (CFDI 4.0)</h2>
          <p className="text-xs text-muted">Emisión y timbrado de facturas para ventas de mostrador y mayoreo.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowIssueModal(true)}
          className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-fg shadow transition hover:opacity-95"
        >
          + Emitir Nueva Factura
        </button>
      </div>

      {statusMsg && (
        <div
          className={`rounded-xl p-3 text-sm font-medium ${
            statusMsg.tone === "success"
              ? "border border-success/20 bg-success/10 text-success"
              : "border border-danger/20 bg-danger/10 text-danger"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Tabla de Facturas */}
      <div className="overflow-x-auto rounded-2xl border border-app bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-app bg-bg/50 text-xs font-semibold text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">UUID Fiscal (SAT)</th>
              <th className="px-4 py-3">Receptor</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted">
                  No hay facturas emitidas todavía.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-bg/40 transition">
                  <td className="px-4 py-3 font-mono font-bold text-fg">{inv.folio}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {inv.fiscalUuid.slice(0, 8)}...{inv.fiscalUuid.slice(-8)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-fg">{inv.receiverName}</div>
                    <div className="font-mono text-xs text-muted">{inv.receiverRfc}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-fg">
                    {formatCents(inv.total, inv.currency || currency)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDateString(inv.issuedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                        inv.status === "issued"
                          ? "bg-success/15 text-success"
                          : "bg-danger/15 text-danger"
                      }`}
                    >
                      {inv.status === "issued" ? "Vigente" : "Cancelada"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadXml(inv.id, inv.folio)}
                        className="rounded-lg border border-app bg-bg px-2.5 py-1 text-xs font-semibold text-fg hover:border-primary"
                        title="Descargar XML"
                      >
                        XML
                      </button>
                      {inv.status === "issued" && (
                        <button
                          type="button"
                          onClick={() => handleCancelInvoice(inv.id)}
                          className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/20"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Emisión */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-app bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-app pb-3">
              <h3 className="text-lg font-bold text-fg">Emitir Factura CFDI 4.0</h3>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="text-muted hover:text-fg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueInvoice} className="space-y-4">
              {/* Selección de venta */}
              <div>
                <label className="text-xs font-bold uppercase text-muted">Venta a Facturar</label>
                <select
                  value={selectedSaleId}
                  onChange={(e) => setSelectedSaleId(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-app bg-bg px-3 text-sm font-semibold text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {candidateSales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.folio} · {s.customerName || "Público en general"} · {formatCents(s.total, currency)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Checkbox datos fiscales personalizados */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="customReceiver"
                  checked={useCustomReceiver}
                  onChange={(e) => setUseCustomReceiver(e.target.checked)}
                  className="accent-primary h-4 w-4 rounded"
                />
                <label htmlFor="customReceiver" className="text-xs font-semibold text-fg cursor-pointer">
                  Especificar RFC y Datos Fiscales del Cliente
                </label>
              </div>

              {useCustomReceiver && (
                <div className="space-y-3 rounded-xl border border-app bg-bg/50 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase text-muted">RFC Receptor</label>
                      <input
                        type="text"
                        value={receiverRfc}
                        onChange={(e) => setReceiverRfc(e.target.value)}
                        placeholder="XAXX010101000"
                        className="mt-1 h-10 w-full rounded-lg border border-app bg-bg px-3 font-mono text-sm uppercase text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-muted">Código Postal</label>
                      <input
                        type="text"
                        value={receiverPostalCode}
                        onChange={(e) => setReceiverPostalCode(e.target.value)}
                        placeholder="91000"
                        className="mt-1 h-10 w-full rounded-lg border border-app bg-bg px-3 font-mono text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-muted">Razón Social o Nombre</label>
                    <input
                      type="text"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="Juan Pérez Gómez"
                      className="mt-1 h-10 w-full rounded-lg border border-app bg-bg px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase text-muted">Régimen Fiscal</label>
                      <select
                        value={receiverRegime}
                        onChange={(e) => setReceiverRegime(e.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-app bg-bg px-2 text-xs font-medium text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="616">616 · Sin obligaciones fiscales</option>
                        <option value="626">626 · RESICO</option>
                        <option value="605">605 · Sueldos y Salarios</option>
                        <option value="612">612 · Personas Físicas Act. Emp.</option>
                        <option value="601">601 · General de Ley PM</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-muted">Uso de CFDI</label>
                      <select
                        value={cfdiUse}
                        onChange={(e) => setCfdiUse(e.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-app bg-bg px-2 text-xs font-medium text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="G03">G03 · Gastos en general</option>
                        <option value="G01">G01 · Adquisición de mercancías</option>
                        <option value="S01">S01 · Sin efectos fiscales</option>
                        <option value="CP01">CP01 · Pagos</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="h-11 rounded-xl border border-app px-4 text-sm font-semibold text-muted hover:text-fg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedSaleId}
                  className="h-11 rounded-xl bg-primary px-6 text-sm font-bold text-primary-fg shadow transition hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? "Timbrando ante SAT..." : "Timbrar CFDI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
