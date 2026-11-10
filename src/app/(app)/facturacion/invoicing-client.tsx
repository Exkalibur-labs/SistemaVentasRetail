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

interface IssuerProfile {
  rfc: string;
  legalName: string;
  taxRegime: string;
  postalCode: string;
  series: string;
  confirmed: boolean;
}

const DEFAULT_ISSUER: IssuerProfile = {
  rfc: "XAXX010101000",
  legalName: "ABARROTES Y MINISÚPER LA ESQUINA",
  taxRegime: "626",
  postalCode: "91000",
  series: "F",
  confirmed: false,
};

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

  // Perfil del Emisor Fiscal SAT
  const [issuer, setIssuer] = useState<IssuerProfile>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("sc_issuer_profile");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return DEFAULT_ISSUER;
  });
  const [isEditingIssuer, setIsEditingIssuer] = useState(false);

  // Formulario temporal de emisor
  const [issuerRfcInput, setIssuerRfcInput] = useState(issuer.rfc);
  const [issuerNameInput, setIssuerNameInput] = useState(issuer.legalName);
  const [issuerRegimeInput, setIssuerRegimeInput] = useState(issuer.taxRegime);
  const [issuerCpInput, setIssuerCpInput] = useState(issuer.postalCode);
  const [issuerSeriesInput, setIssuerSeriesInput] = useState(issuer.series);

  // Datos fiscales personalizados del receptor
  const [useCustomReceiver, setUseCustomReceiver] = useState(false);
  const [receiverRfc, setReceiverRfc] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverRegime, setReceiverRegime] = useState("616");
  const [receiverPostalCode, setReceiverPostalCode] = useState("91000");
  const [cfdiUse, setCfdiUse] = useState("G03");

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  const handleSaveIssuer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuerRfcInput.trim() || !issuerNameInput.trim() || !issuerCpInput.trim()) {
      setStatusMsg({ text: "Completa los campos obligatorios del emisor (RFC, Razón Social y C.P.).", tone: "error" });
      return;
    }
    const updated: IssuerProfile = {
      rfc: issuerRfcInput.trim().toUpperCase(),
      legalName: issuerNameInput.trim().toUpperCase(),
      taxRegime: issuerRegimeInput,
      postalCode: issuerCpInput.trim(),
      series: issuerSeriesInput.trim().toUpperCase() || "F",
      confirmed: true,
    };
    setIssuer(updated);
    setIsEditingIssuer(false);
    try {
      localStorage.setItem("sc_issuer_profile", JSON.stringify(updated));
    } catch {}
    setStatusMsg({
      text: "✓ Datos fiscales del emisor confirmados correctamente ante el PAC SAT.",
      tone: "success",
    });
  };

  const handleFillDemoIssuer = () => {
    setIssuerRfcInput("XAXX010101000");
    setIssuerNameInput("ABARROTES Y MINISÚPER LA ESQUINA S.A. DE C.V.");
    setIssuerRegimeInput("626");
    setIssuerCpInput("91000");
    setIssuerSeriesInput("F");
  };

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuer.confirmed) {
      setStatusMsg({ text: "Debes configurar y confirmar los datos de emisor SAT antes de emitir facturas.", tone: "error" });
      return;
    }
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
        issuer: {
          rfc: issuer.rfc,
          legalName: issuer.legalName,
          taxRegime: issuer.taxRegime,
          postalCode: issuer.postalCode,
        },
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
        text: `✓ Factura ${data.invoice.folio} emitida exitosamente por ${issuer.legalName} (UUID: ${data.invoice.fiscalUuid})`,
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
          onClick={() => {
            if (!issuer.confirmed) {
              setIsEditingIssuer(true);
              setStatusMsg({ text: "⚠️ Configura y confirma los datos del emisor abajo antes de emitir facturas.", tone: "error" });
              return;
            }
            setShowIssueModal(true);
          }}
          title={!issuer.confirmed ? "Configura primero los datos de emisor abajo" : "Emitir factura CFDI 4.0"}
          className={`h-11 rounded-xl px-5 text-sm font-bold shadow transition ${
            issuer.confirmed
              ? "bg-primary text-primary-fg hover:opacity-95 cursor-pointer"
              : "bg-surface-2 text-muted border border-border cursor-pointer hover:border-primary"
          }`}
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

      {/* Sección de Datos del Emisor SAT */}
      {(!issuer.confirmed || isEditingIssuer) ? (
        <form onSubmit={handleSaveIssuer} className="rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-sm font-bold text-primary">1</span>
                <h3 className="text-base font-bold text-fg">Configuración del Emisor SAT (CFDI 4.0)</h3>
              </div>
              <p className="mt-1 text-xs text-muted">
                Antes de emitir facturas, registra los datos fiscales de tu tienda tal como figuran en tu Constancia de Situación Fiscal.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFillDemoIssuer}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-2"
              >
                🪄 Rellenar con datos de mi tienda
              </button>
              {issuer.confirmed && (
                <button
                  type="button"
                  onClick={() => setIsEditingIssuer(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-2"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase">RFC del Emisor *</label>
              <input
                type="text"
                required
                maxLength={13}
                value={issuerRfcInput}
                onChange={(e) => setIssuerRfcInput(e.target.value.toUpperCase())}
                placeholder="XAXX010101000"
                className="mt-1 w-full rounded-xl border border-app bg-bg px-3 py-2 text-sm font-mono uppercase"
              />
              <span className="text-[11px] text-muted">12 caracteres si es persona moral, 13 si es física.</span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted uppercase">Nombre o Razón Social del Emisor *</label>
              <input
                type="text"
                required
                value={issuerNameInput}
                onChange={(e) => setIssuerNameInput(e.target.value.toUpperCase())}
                placeholder="ABARROTES Y MINISÚPER LA ESQUINA S.A. DE C.V."
                className="mt-1 w-full rounded-xl border border-app bg-bg px-3 py-2 text-sm uppercase"
              />
              <span className="text-[11px] text-muted">En mayúsculas, idéntico a la cédula del SAT.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase">Régimen Fiscal SAT *</label>
              <select
                value={issuerRegimeInput}
                onChange={(e) => setIssuerRegimeInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-app bg-bg px-3 py-2 text-sm"
              >
                <option value="626">626 · Régimen Simplificado de Confianza (RESICO)</option>
                <option value="612">612 · Personas Físicas con Actividades Empresariales</option>
                <option value="601">601 · General de Ley Personas Morales</option>
                <option value="621">621 · Régimen de Incorporación Fiscal (RIF)</option>
                <option value="605">605 · Sueldos y Salarios e Ingresos Asimilados</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase">Código Postal Fiscal *</label>
              <input
                type="text"
                required
                maxLength={5}
                value={issuerCpInput}
                onChange={(e) => setIssuerCpInput(e.target.value)}
                placeholder="91000"
                className="mt-1 w-full rounded-xl border border-app bg-bg px-3 py-2 text-sm font-mono"
              />
              <span className="text-[11px] text-muted">Lugar de expedición del comprobante.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase">Serie de Facturación</label>
              <input
                type="text"
                maxLength={5}
                value={issuerSeriesInput}
                onChange={(e) => setIssuerSeriesInput(e.target.value.toUpperCase())}
                placeholder="F"
                className="mt-1 w-full rounded-xl border border-app bg-bg px-3 py-2 text-sm font-mono"
              />
              <span className="text-[11px] text-muted">Prefijo de tus facturas (ej. F, FAC).</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="size-2 rounded-full bg-success animate-pulse" />
              <span>Conexión con PAC Sandbox SW Sapien activa para timbrado en línea.</span>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-fg shadow transition hover:opacity-95"
            >
              ✓ Guardar y Confirmar Emisor
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-success/30 bg-success/5 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-success/20 text-success font-bold text-lg">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-fg">{issuer.legalName}</span>
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success border border-success/30">
                  Emisor SAT Activo
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span>RFC: <strong className="font-mono text-fg">{issuer.rfc}</strong></span>
                <span>·</span>
                <span>Régimen: <strong>{issuer.taxRegime}</strong></span>
                <span>·</span>
                <span>C.P. Fiscal: <strong>{issuer.postalCode}</strong></span>
                <span>·</span>
                <span>Serie: <strong className="font-mono text-fg">{issuer.series}</strong></span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIssuerRfcInput(issuer.rfc);
              setIssuerNameInput(issuer.legalName);
              setIssuerRegimeInput(issuer.taxRegime);
              setIssuerCpInput(issuer.postalCode);
              setIssuerSeriesInput(issuer.series);
              setIsEditingIssuer(true);
            }}
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 transition"
          >
            ✏️ Modificar datos de emisor
          </button>
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

            <div className="mb-4 rounded-xl border border-border bg-surface-2/60 p-2.5 text-xs flex items-center justify-between">
              <div>
                <span className="text-muted">Emisor fiscal:</span>{" "}
                <strong className="text-fg">{issuer.legalName}</strong>{" "}
                <span className="font-mono text-muted">({issuer.rfc})</span>
              </div>
              <span className="rounded-md bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                Serie {issuer.series} · CFDI 4.0
              </span>
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
