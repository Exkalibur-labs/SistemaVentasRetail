"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Wallet,
  Barcode,
  ShoppingCart,
  ReceiptText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Sparkles,
  HelpCircle,
  Printer,
  ScanLine,
} from "lucide-react";

interface Step {
  id: string;
  number: number;
  title: string;
  shortDesc: string;
  detail: string;
  href: string;
  actionText: string;
  icon: typeof Store;
  tip?: string;
}

const STEPS: Step[] = [
  {
    id: "step_branding",
    number: 1,
    title: "1. Define la Identidad de tu Negocio",
    shortDesc: "Nombre comercial, logo, colores y encabezado de tickets.",
    detail:
      "Personaliza el nombre de tu tienda (ej. 'Abarrotes y Minisúper La Esquina'), logotipo, colores de la interfaz y la leyenda de agradecimiento o RFC que aparecerá impresa en los recibos térmicos de tus clientes.",
    href: "/configuracion",
    actionText: "Configurar Nombre y Marca",
    icon: Store,
    tip: "Tip: Si cambias el nombre comercial, se actualizará automáticamente en el encabezado y en los tickets impresos.",
  },
  {
    id: "step_cash_opening",
    number: 2,
    title: "2. Apertura de Turno y Fondo Inicial de Caja",
    shortDesc: "Registra el monto en efectivo para cambio (morralla).",
    detail:
      "Antes de comenzar a vender, es obligatorio abrir el turno de caja indicando el Fondo Inicial (por ejemplo $500.00 o $1,000.00 en billetes y monedas). Esto garantiza que el arqueo de caja (Corte X y Z) cuadre exactamente al final del día sin faltantes ni sobrantes.",
    href: "/caja",
    actionText: "Abrir Caja con Fondo Inicial",
    icon: Wallet,
    tip: "Importante: El punto de venta requiere una caja abierta para recibir efectivo y calcular el cambio.",
  },
  {
    id: "step_catalog",
    number: 3,
    title: "3. Carga tus Productos y Códigos de Barras",
    shortDesc: "Precios, categorías y escaneo ágil con pistola Znemaz.",
    detail:
      "El sistema incluye abarrotes de alta rotación listos para usar (Chokis, Coca-Cola, Leche, Huevo, etc.). Puedes dar de alta nuevos productos por pieza o granel (kg), asignarles precio de venta, costo promedio y códigos de barras usando tu lector inalámbrico Znemaz 1D/2D.",
    href: "/inventario/escaner",
    actionText: "Escanear y Cargar Productos",
    icon: Barcode,
    tip: "Hardware: El lector Znemaz funciona en modo HID (teclado rápido) sin necesidad de controladores.",
  },
  {
    id: "step_pos_sales",
    number: 4,
    title: "4. Realiza tu Primera Venta en el POS",
    shortDesc: "Cobro rápido con teclado (F2, F4, F8) o lector y ticket 58mm.",
    detail:
      "Abre el Punto de Venta para cobrar. Busca por nombre o dispara con la pistola láser. Cobra en efectivo con cálculo automático de cambio o con tarjeta, e imprime el comprobante directo en tu mini impresora Bluetooth SUZWIP de 58mm.",
    href: "/pos",
    actionText: "Ir al Punto de Venta (POS)",
    icon: ShoppingCart,
    tip: "Atajos de teclado: F2 para buscar, F4 para cobrar, F8 para poner ticket en espera.",
  },
  {
    id: "step_invoicing",
    number: 5,
    title: "5. Facturación Electrónica CFDI 4.0",
    shortDesc: "Configura tus datos de emisor SAT y emite comprobantes oficiales.",
    detail:
      "Carga tus datos fiscales como Emisor (RFC, Razón Social, Régimen fiscal como RESICO 626 o Actividad Empresarial 612 y Código Postal). Una vez confirmado, podrás convertir cualquier venta en factura timbrada con código QR oficial del SAT y XML descargable.",
    href: "/facturacion",
    actionText: "Configurar Emisor y Facturar",
    icon: ReceiptText,
    tip: "Fiscal: Cuenta con conexión PAC en modo pruebas (sandbox) para que puedas practicar sin impacto contable.",
  },
];

export function QuickStartGuide() {
  const [open, setOpen] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("step_branding");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sc_completed_steps");
      if (saved) setCompletedSteps(JSON.parse(saved));
      const savedOpen = localStorage.getItem("sc_guide_open");
      if (savedOpen !== null) setOpen(savedOpen === "true");
    } catch {}
  }, []);

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("sc_completed_steps", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sc_guide_open", String(next));
      } catch {}
      return next;
    });
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / STEPS.length) * 100);

  const currentStep = STEPS.find((s) => s.id === activeTab) ?? STEPS[0];
  const StepIcon = currentStep.icon;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border-2 border-primary/20 bg-card shadow-sm transition">
      {/* Header del Acordeón / Widget */}
      <div
        onClick={toggleOpen}
        className="flex cursor-pointer items-center justify-between border-b border-app bg-surface-2/40 p-4 transition hover:bg-surface-2/70"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-fg">Guía Didáctica de Inicio Rápido</h2>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {completedCount} de {STEPS.length} completados ({progressPercent}%)
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Paso a paso para configurar tu tienda, abrir caja con fondo y empezar a cobrar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Barra de progreso visual */}
          <div className="hidden w-28 sm:block">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
            aria-label={open ? "Ocultar guía" : "Mostrar guía"}
          >
            {open ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
          </button>
        </div>
      </div>

      {/* Contenido desplegable */}
      {open && (
        <div className="p-4 sm:p-5">
          {/* Navegación por pasos (Lista Horizontal/Pills) */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {STEPS.map((s) => {
              const isDone = !!completedSteps[s.id];
              const isSelected = activeTab === s.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveTab(s.id)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border/70 bg-surface hover:bg-surface-2/60"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                        isDone
                          ? "bg-success text-white"
                          : isSelected
                          ? "bg-primary text-primary-fg"
                          : "bg-surface-2 text-muted"
                      }`}
                    >
                      {isDone ? "✓" : s.number}
                    </span>
                    <Icon className={`size-4 ${isSelected ? "text-primary" : "text-muted"}`} />
                  </div>
                  <span className="mt-2 text-xs font-bold text-fg line-clamp-1">{s.title.slice(3)}</span>
                  <span className="text-[11px] text-muted line-clamp-1">{s.shortDesc}</span>
                </button>
              );
            })}
          </div>

          {/* Tarjeta de Detalle del Paso Seleccionado */}
          <div className="mt-4 rounded-xl border border-app bg-bg/50 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <StepIcon className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-fg">{currentStep.title}</h3>
                    <button
                      type="button"
                      onClick={() => toggleStep(currentStep.id)}
                      className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-muted hover:bg-surface-2"
                      title="Marcar o desmarcar como completado"
                    >
                      {completedSteps[currentStep.id] ? (
                        <>
                          <CheckCircle2 className="size-4 text-success" />
                          <span className="text-success">Completado</span>
                        </>
                      ) : (
                        <>
                          <Circle className="size-4 text-muted" />
                          <span>Marcar hecho</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-text leading-relaxed">{currentStep.detail}</p>
                  {currentStep.tip && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-surface-2/60 px-2.5 py-1 text-xs text-muted">
                      <HelpCircle className="size-3.5 shrink-0 text-primary" />
                      <span>{currentStep.tip}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón de acción hacia el módulo correspondiente */}
              <div className="shrink-0 pt-2 sm:pt-0">
                <Link
                  href={currentStep.href}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-fg shadow-sm transition hover:opacity-95"
                >
                  {currentStep.actionText} →
                </Link>
              </div>
            </div>
          </div>

          {/* Hardware Compatibilidad Banner */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-2/30 px-3.5 py-2 text-xs text-muted">
            <div className="flex items-center gap-2">
              <ScanLine className="size-4 text-primary" />
              <span>
                Lector Compatible: <strong>Znemaz 1D/2D Inalámbrico</strong> (Disparo continuo HID sin latencia)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Printer className="size-4 text-primary" />
              <span>
                Impresora Térmica: <strong>SUZWIP 58mm Bluetooth/USB</strong> (Corte y ESC/POS nativo)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}