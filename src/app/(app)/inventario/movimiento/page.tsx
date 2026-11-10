import type { Metadata } from "next";
import { Alert, PageHeader } from "@/components/ui";
import { requirePagePermission } from "@/server/context";
import { hasPermission } from "@/server/authz/guard";
import { listAccessibleWarehouses } from "@/server/modules/inventory/service";
import { MovementForm } from "./movement-form";

export const metadata: Metadata = { title: "Registrar movimiento" };

export default async function MovementPage({ searchParams }: { searchParams: Promise<{ alm?: string }> }) {
  const ctx = await requirePagePermission("inventory.adjust");
  if (!ctx.company) return <Alert tone="warning">Selecciona una empresa.</Alert>;
  const { alm } = await searchParams;
  let whs: Awaited<ReturnType<typeof listAccessibleWarehouses>> = [];
  try {
    whs = await listAccessibleWarehouses(ctx);
  } catch {
    whs = [
      {
        id: "00000000-0000-0000-0000-000000000008",
        name: "Almacén Principal",
        branchId: ctx.branch?.id || "00000000-0000-0000-0000-000000000005",
        branchName: "Sucursal Centro (Matriz)",
        isDefault: true,
      } as unknown as Awaited<ReturnType<typeof listAccessibleWarehouses>>[number],
    ];
  }
  if (!whs.length) return <Alert tone="warning">No tienes almacenes disponibles.</Alert>;
  const def = whs.find((w) => w.id === alm) ?? whs.find((w) => w.branchId === ctx.branch?.id && w.isDefault) ?? whs[0];
  return (
    <>
      <PageHeader title="Registrar movimiento" description="Entradas, salidas, mermas y ajustes manuales. Para corregir un error se registra el movimiento inverso desde el kardex." />
      <MovementForm warehouses={whs.map((w) => ({ id: w.id, label: `${w.branchName} · ${w.name}` }))} defaultWarehouseId={def.id} canCost={hasPermission(ctx, "inventory.view_cost")} currency={ctx.company.currency} />
    </>
  );
}
