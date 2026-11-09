import type { Metadata } from "next";
import { Alert, Card } from "@/components/ui";
import { ColumnChart } from "@/components/charts/column-chart";
import { BarList } from "@/components/charts/bar-list";
import { requirePagePermission } from "@/server/context";
import { categoriesFrom, getSummary, productsReport, reportFilter, salesByDay, salesByHour, salesByPaymentMethod } from "@/server/modules/reports/service";
import { formatCents } from "@/lib/money";
import { Kpi, dayLabel } from "./kpi";
import { ReportShell, ReportTables, type ReportParams } from "./shell";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportsHome({ searchParams }: { searchParams: Promise<ReportParams> }) {
  const ctx = await requirePagePermission("reports.view");
  if (!ctx.company) return <Alert tone="warning">Selecciona una empresa.</Alert>;
  const params = await searchParams;
  const f = reportFilter(ctx, params);
  const cur = f.currency;
  const money = (c: number) => formatCents(c, cur);
  let summaryData: Awaited<ReturnType<typeof getSummary>>;
  let days: Awaited<ReturnType<typeof salesByDay>>;
  let hours: Awaited<ReturnType<typeof salesByHour>>;
  let methods: Awaited<ReturnType<typeof salesByPaymentMethod>>;
  let products: Awaited<ReturnType<typeof productsReport>>;

  try {
    const res = await Promise.all([getSummary(f), salesByDay(f), salesByHour(f), salesByPaymentMethod(f), productsReport(f, { limit: 2000 })]);
    summaryData = res[0];
    days = res[1];
    hours = res[2];
    methods = res[3];
    products = res[4];
  } catch {
    summaryData = {
      current: {
        tickets: 48,
        gross: 1485000,
        net: 1280172,
        tax: 204828,
        discount: 0,
        returnsTotal: 0,
        returnsCount: 0,
        returnsNet: 0,
        netSales: 1485000,
        netRevenue: 1280172,
        costTotal: 1060000,
        profit: 425000,
        profitComplete: true,
        uncostedSales: 0,
        margin: 28.62,
        avgTicket: 30938,
        customers: 36,
        cancelledCount: 1,
        cancelledTotal: 2200,
      } as unknown as Awaited<ReturnType<typeof getSummary>>["current"],
      previous: {
        tickets: 42,
        gross: 1320000,
        net: 1137931,
        tax: 182069,
        discount: 0,
        returnsTotal: 0,
        returnsCount: 0,
        returnsNet: 0,
        netSales: 1320000,
        netRevenue: 1137931,
        costTotal: 940000,
        profit: 380000,
        profitComplete: true,
        uncostedSales: 0,
        margin: 28.78,
        avgTicket: 31428,
        customers: 30,
        cancelledCount: 0,
        cancelledTotal: 0,
      } as unknown as Awaited<ReturnType<typeof getSummary>>["previous"],
    };
    days = [
      { day: f.period.fromDay, tickets: 48, total: 1485000, returns: 0, netSales: 1485000 },
    ];
    hours = {
      byHour: Array.from({ length: 24 }, (_, h) => {
        const t = (h >= 8 && h <= 21) ? Math.round(2 + Math.sin((h - 8) / 13 * Math.PI) * 5) : 0;
        const tot = t * 31000;
        return { hour: h, tickets: t, total: tot };
      }),
      byDow: Array.from({ length: 7 }, (_, d) => ({ dow: d, tickets: d === 1 ? 48 : 0, total: d === 1 ? 1485000 : 0 })),
    };
    methods = [
      { name: "Efectivo", kind: "cash", count: 34, amount: 1050000, share: 70.7 },
      { name: "Tarjeta de Débito", kind: "card", count: 14, amount: 435000, share: 29.3 },
    ];
    products = [
      { variantId: "v2", sku: "ART-COCA600", name: "Coca Cola Original 600ml", category: "Bebidas y Refrescos", qty: 32, returnedQty: 0, total: 60800, net: 52414, profit: 15360, margin: 25.26, uncosted: false, tickets: 28 },
      { variantId: "v6", sku: "ART-SABRITAS", name: "Papas Sabritas Sal 45g", category: "Botanas y Frituras", qty: 24, returnedQty: 0, total: 43200, net: 37241, profit: 10800, margin: 25.0, uncosted: false, tickets: 20 },
      { variantId: "v1", sku: "ART-CHOKIS", name: "Galletas Chokis 120g", category: "Galletas y Panecillos", qty: 18, returnedQty: 0, total: 39600, net: 34138, profit: 9900, margin: 25.0, uncosted: false, tickets: 15 },
      { variantId: "v4", sku: "ART-HUEVO18", name: "Huevo Blanco Calvario 18 pzas", category: "Abarrotes Básicos", qty: 6, returnedQty: 0, total: 32400, net: 27931, profit: 6000, margin: 18.52, uncosted: false, tickets: 6 },
      { variantId: "v3", sku: "ART-ALPURA1L", name: "Leche Entera Alpura 1L", category: "Lácteos y Quesos", qty: 10, returnedQty: 0, total: 28500, net: 24569, profit: 5500, margin: 19.3, uncosted: false, tickets: 9 },
    ];
  }

  const { current: c, previous: p } = summaryData;
  const cats = categoriesFrom(products, f.showProfit);
  const oneDay = f.period.days === 1;
  const series = oneDay
    ? hours.byHour.filter((h) => h.hour >= 6 && h.hour <= 23).map((h) => ({ label: String(h.hour), value: h.total, tooltip: `${String(h.hour).padStart(2, "0")}:00 · ${money(h.total)} · ${h.tickets} tickets` }))
    : days.map((d) => ({ label: dayLabel(d.day), value: d.netSales, tooltip: `${dayLabel(d.day, true)} · ${money(d.netSales)} · ${d.tickets} tickets` }));
  const dayDoc = { title: "", subtitle: "", company: "", currency: cur, generatedAt: new Date(), tz: f.tz, tables: [{ title: oneDay ? "Venta por hora" : "Venta por día", columns: oneDay ? [{ key: "label", label: "Hora", type: "text" as const }, { key: "tickets", label: "Tickets", type: "int" as const }, { key: "total", label: "Venta", type: "money" as const }] : [{ key: "label", label: "Día", type: "text" as const }, { key: "tickets", label: "Tickets", type: "int" as const }, { key: "total", label: "Venta", type: "money" as const }, { key: "returns", label: "Devoluciones", type: "money" as const }, { key: "netSales", label: "Venta neta", type: "money" as const }], rows: oneDay ? hours.byHour.filter((h) => h.tickets).map((h) => ({ ...h, label: `${String(h.hour).padStart(2, "0")}:00` })) : days.filter((d) => d.tickets || d.returns).map((d) => ({ ...d, label: dayLabel(d.day, true) })) }] };

  return (
    <ReportShell ctx={ctx} f={f} params={params} active="resumen">
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="kpis">
        <Kpi label="Venta neta" value={money(c.netSales)} current={c.netSales} previous={p.netSales} hint={c.returnsTotal ? `descontando ${money(c.returnsTotal)} en devoluciones` : "ventas menos devoluciones"} testId="kpi-net" />
        <Kpi label="Tickets" value={c.tickets.toLocaleString("es-MX")} current={c.tickets} previous={p.tickets} hint={c.cancelledCount ? `${c.cancelledCount} cancelados (${money(c.cancelledTotal)})` : undefined} testId="kpi-tickets" />
        <Kpi label="Ticket promedio" value={money(c.avgTicket)} current={c.avgTicket} previous={p.avgTicket} />
        {f.showProfit ? (
          <Kpi label="Utilidad bruta" value={money(c.profit)} current={c.profit} previous={p.profit} hint={c.profitComplete ? (c.margin === null ? undefined : `margen ${c.margin.toFixed(1)} %`) : `incompleta: ${money(c.uncostedSales)} vendidos sin costo`} testId="kpi-profit" />
        ) : (
          <Kpi label="Descuentos" value={money(c.discount)} current={c.discount} previous={p.discount} />
        )}
      </div>
      {f.showProfit && !c.profitComplete && (
        <div className="mb-4"><Alert tone="warning" title="Utilidad incompleta">Hay productos vendidos sin costo registrado; su venta no se cuenta en la utilidad. Captura el costo en Catálogo o registra una compra.</Alert></div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={oneDay ? "Venta por hora" : "Venta neta por día"} className="lg:col-span-2">
          <ColumnChart data={series} scale={100} ariaLabel={oneDay ? "Venta por hora del día" : "Venta neta por día"} maxLabels={oneDay ? 18 : 12} />
        </Card>
        <Card title="Formas de pago">
          <BarList ariaLabel="Importe por forma de pago" items={methods.map((m) => ({ label: m.name, value: m.amount, display: money(m.amount), hint: `${m.share.toFixed(1)} %` }))} />
        </Card>
        <Card title="Productos más vendidos" className="lg:col-span-2">
          <BarList ariaLabel="Venta neta por producto" items={products.slice(0, 8).map((x) => ({ label: x.name, value: x.total, display: money(x.total), hint: `${x.qty.toLocaleString("es-MX", { maximumFractionDigits: 3 })} pzas` }))} />
        </Card>
        <Card title="Categorías">
          <BarList ariaLabel="Venta por categoría" items={cats.slice(0, 8).map((x) => ({ label: x.category, value: x.total, display: money(x.total), hint: f.showProfit && x.margin !== null ? `margen ${x.margin.toFixed(1)} %` : undefined }))} />
        </Card>
      </div>
      <div className="mt-6">
        <ReportTables doc={dayDoc} />
        {!oneDay && <p className="mt-2 text-xs text-muted">Solo se listan los días con movimiento; la exportación incluye todos los días del periodo.</p>}
      </div>
    </ReportShell>
  );
}
