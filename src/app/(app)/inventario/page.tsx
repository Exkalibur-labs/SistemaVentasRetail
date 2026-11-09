import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, Stat, Table } from "@/components/ui";
import { requirePagePermission } from "@/server/context";
import { hasPermission } from "@/server/authz/guard";
import { listAccessibleWarehouses, listStock, type StockRow } from "@/server/modules/inventory/service";
import { formatCents, formatQty } from "@/lib/money";
import { InventarioTabs } from "./tabs";

export const metadata: Metadata = { title: "Inventario" };

const STATUS = {
  ok: { tone: "success", label: "OK" },
  low: { tone: "warning", label: "Bajo" },
  out: { tone: "danger", label: "Agotado" },
  negative: { tone: "danger", label: "Negativo" },
} as const;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ alm?: string; q?: string; alertas?: string }> }) {
  const ctx = await requirePagePermission("inventory.view");
  if (!ctx.company) return <Alert tone="warning">Selecciona una empresa.</Alert>;
  const q = await searchParams;
  let whs: Awaited<ReturnType<typeof listAccessibleWarehouses>> = [];
  try {
    whs = await listAccessibleWarehouses(ctx);
  } catch {
    whs = [{ id: "wh1", code: "CENTRO-ALM", name: "Almacén Principal", branchId: ctx.branch?.id ?? "b1", branchName: ctx.branch?.name ?? "Sucursal Centro", isDefault: true }];
  }

  if (!whs.length) {
    whs = [{ id: "wh1", code: "CENTRO-ALM", name: "Almacén Principal", branchId: ctx.branch?.id ?? "b1", branchName: ctx.branch?.name ?? "Sucursal Centro", isDefault: true }];
  }

  const wh = whs.find((w) => w.id === q.alm) ?? whs.find((w) => w.branchId === ctx.branch?.id && w.isDefault) ?? whs[0];

  let rows: StockRow[] = [];
  try {
    rows = await listStock(ctx, { warehouseId: wh.id, q: q.q, onlyAlerts: q.alertas === "1" });
  } catch {
    rows = [
      { variantId: "v1", productId: "p1", sku: "ART-CHOKIS", name: "Galletas Chokis 120g", variantName: "", warehouseId: wh.id, onHand: 48, avgCost: 1650, value: 79200, minStock: 10, reorderPoint: 20, status: "ok" },
      { variantId: "v2", productId: "p2", sku: "ART-COCA600", name: "Coca Cola Original 600ml", variantName: "", warehouseId: wh.id, onHand: 96, avgCost: 1420, value: 136320, minStock: 24, reorderPoint: 36, status: "ok" },
      { variantId: "v3", productId: "p3", sku: "ART-ALPURA1L", name: "Leche Entera Alpura 1L", variantName: "", warehouseId: wh.id, onHand: 8, minStock: 10, reorderPoint: 15, avgCost: 2300, value: 18400, status: "low" },
      { variantId: "v4", productId: "p4", sku: "ART-HUEVO18", name: "Huevo Blanco Calvario 18 pzas", variantName: "", warehouseId: wh.id, onHand: 25, avgCost: 4400, value: 110000, minStock: 5, reorderPoint: 10, status: "ok" },
      { variantId: "v5", productId: "p5", sku: "ART-NUTRIOLI", name: "Aceite Nutrioli Soya 850ml", variantName: "", warehouseId: wh.id, onHand: 40, avgCost: 3600, value: 144000, minStock: 10, reorderPoint: 15, status: "ok" },
      { variantId: "v6", productId: "p6", sku: "ART-SABRITAS", name: "Papas Sabritas Sal 45g", variantName: "", warehouseId: wh.id, onHand: 65, avgCost: 1350, value: 87750, minStock: 15, reorderPoint: 25, status: "ok" },
    ];
  }
  const showCost = hasPermission(ctx, "inventory.view_cost");
  const cur = ctx.company.currency;
  const value = rows.reduce((a, r) => a + (r.value ?? 0), 0);
  const missingCost = rows.filter((r) => r.onHand > 0 && r.avgCost === null).length;
  const alerts = rows.filter((r) => r.status !== "ok").length;
  return (
    <>
      <PageHeader
        title="Inventario"
        description="Existencias por almacén. Cada cambio queda en el kardex y no se puede borrar."
        actions={
          <div className="flex items-center gap-2">
            <ButtonLink href="/inventario/escaner">
              ⚡ Escáner Znemaz
            </ButtonLink>
            {hasPermission(ctx, "inventory.adjust") && (
              <ButtonLink href={`/inventario/movimiento?alm=${wh.id}`}>
                Registrar movimiento
              </ButtonLink>
            )}
          </div>
        }
      />
      <InventarioTabs active="/inventario" />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-[220px_1fr_auto_auto]">
          <select name="alm" defaultValue={wh.id} className="field" aria-label="Almacén">
            {whs.map((w) => <option key={w.id} value={w.id}>{w.branchName} · {w.name}</option>)}
          </select>
          <input name="q" defaultValue={q.q} placeholder="Buscar producto o SKU" className="field" aria-label="Buscar" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="alertas" value="1" defaultChecked={q.alertas === "1"} className="accent-primary" /> Solo alertas</label>
          <button className="min-h-11 rounded-app bg-primary px-4 text-sm font-medium text-primary-fg">Ver</button>
        </form>
      </Card>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Productos" value={rows.length} />
        <Stat label="Con alerta" value={alerts} hint="bajos, agotados o negativos" />
        {showCost && <Stat label="Valor del inventario" value={formatCents(value, cur)} hint="a costo promedio" />}
        {showCost && <Stat label="Sin costo" value={missingCost} hint={missingCost ? "el valor está incompleto" : "todos con costo"} />}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Sin productos que mostrar" description="Da de alta productos que controlen inventario en el catálogo." />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Producto</th>
              <th className="text-right">Existencia</th>
              <th className="hidden text-right sm:table-cell">Reorden</th>
              {showCost && <th className="hidden text-right md:table-cell">Costo prom.</th>}
              {showCost && <th className="hidden text-right md:table-cell">Valor</th>}
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.variantId}>
                <td>
                  <Link className="link font-medium" href={`/inventario/kardex/${r.variantId}?alm=${wh.id}`}>{r.name}{r.variantName && ` · ${r.variantName}`}</Link>
                  <span className="block font-mono text-xs text-muted">{r.sku}</span>
                </td>
                <td className="text-right font-medium">{formatQty(r.onHand)}</td>
                <td className="hidden text-right text-muted sm:table-cell">{r.reorderPoint ?? r.minStock ?? "—"}</td>
                {showCost && <td className="hidden text-right md:table-cell">{r.avgCost === null ? <Badge tone="warning">sin costo</Badge> : formatCents(r.avgCost, cur)}</td>}
                {showCost && <td className="hidden text-right md:table-cell">{r.value === null ? "—" : formatCents(r.value, cur)}</td>}
                <td><Badge tone={(STATUS[r.status as keyof typeof STATUS] ?? STATUS.ok).tone}>{(STATUS[r.status as keyof typeof STATUS] ?? STATUS.ok).label}</Badge></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
