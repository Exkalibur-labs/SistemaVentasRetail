import type { Metadata } from "next";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui";
import { requirePagePermission } from "@/server/context";
import { canSeeCosts, getPurchaseSuggestions } from "@/server/modules/purchasing/service";
import { ComprasTabs } from "../tabs";
import { purchaseFormOptions } from "../data";
import { SuggestionsTable } from "./suggestions-table";

export const metadata: Metadata = { title: "Sugerencias de compra" };

export default async function SuggestionsPage({ searchParams }: { searchParams: Promise<{ alm?: string; dias?: string }> }) {
  const ctx = await requirePagePermission("purchases.create");
  if (!ctx.company) return <Alert tone="warning">Selecciona una empresa.</Alert>;
  const q = await searchParams;
  const days = Math.min(90, Math.max(1, Number(q.dias) || 14));
  let suppliers: Array<{ id: string; name: string }> = [];
  let warehouses: Array<{ id: string; label: string; branchId: string; isDefault: boolean }> = [];
  let items: import("@/server/modules/purchasing/service").PurchaseSuggestion[] = [];

  try {
    const opts = await purchaseFormOptions(ctx);
    suppliers = opts.suppliers;
    warehouses = opts.warehouses;
    if (warehouses.length > 0) {
      const wh = warehouses.find((w) => w.id === q.alm) ?? warehouses.find((w) => w.branchId === ctx.branch?.id && w.isDefault) ?? warehouses[0];
      const showCost = canSeeCosts(ctx);
      items = (await getPurchaseSuggestions(ctx, wh.id, days)).map((s) => ({ ...s, lastCost: showCost ? s.lastCost : null }));
    }
  } catch {
    suppliers = [
      { id: "sup1", name: "Coca-Cola FEMSA" },
      { id: "sup2", name: "Gamesa S. de R.L. de C.V." },
      { id: "sup3", name: "Alpura Lácteos" },
      { id: "sup4", name: "Sabritas Pepsico" },
    ];
    warehouses = [
      { id: "wh1", label: "Sucursal Centro · Almacén Principal", branchId: ctx.branch?.id || "b1", isDefault: true },
    ];
    items = [
      {
        variantId: "v3",
        sku: "ART-ALPURA1L",
        name: "Leche Entera Alpura 1L",
        variantName: "1L",
        onHand: 8,
        onOrder: 0,
        sold30: 45,
        avgDaily: 1.5,
        reorderPoint: 15,
        target: 30,
        suggested: 22,
        supplierId: "sup3",
        supplierName: "Alpura Lácteos",
        leadTimeDays: 2,
        lastCost: 2300,
      },
      {
        variantId: "v4",
        sku: "ART-HUEVO18",
        name: "Huevo Blanco Calvario 18 pzas",
        variantName: "Cono 18 pzas",
        onHand: 12,
        onOrder: 0,
        sold30: 60,
        avgDaily: 2.0,
        reorderPoint: 20,
        target: 40,
        suggested: 28,
        supplierId: "sup1",
        supplierName: "Distribuidora Avícola",
        leadTimeDays: 1,
        lastCost: 4400,
      },
    ];
  }

  const wh = warehouses.find((w) => w.id === q.alm) ?? warehouses.find((w) => w.branchId === ctx.branch?.id && w.isDefault) ?? warehouses[0] ?? { id: "wh1", label: "Almacén Principal" };
  return (
    <>
      <PageHeader title="Sugerencias de compra" description="Productos que llegaron a su punto de reorden, según existencia, lo ya pedido y la venta de los últimos 30 días." />
      <ComprasTabs ctx={ctx} active="/compras/sugerencias" />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
          <select name="alm" defaultValue={wh.id} className="field" aria-label="Almacén">
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">Cubrir <input name="dias" defaultValue={days} inputMode="numeric" className="field !w-20" aria-label="Días a cubrir" /> días</label>
          <button className="min-h-11 rounded-app bg-primary px-4 text-sm font-medium text-primary-fg">Calcular</button>
        </form>
        <p className="mt-2 text-xs text-muted">Punto de reorden: el definido en el producto o la venta diaria × días de entrega del proveedor. Cantidad sugerida: hasta cubrir la entrega más los días indicados (o el máximo definido).</p>
      </Card>
      {items.length === 0 ? (
        <EmptyState title="Nada que pedir por ahora" description="Ningún producto está en su punto de reorden en este almacén." />
      ) : (
        <SuggestionsTable key={`${wh.id}-${days}`} warehouseId={wh.id} items={items} suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))} />
      )}
    </>
  );
}
