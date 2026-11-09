import type { Metadata } from "next";
import { Alert, PageHeader } from "@/components/ui";
import { requirePagePermission } from "@/server/context";
import { listAccessibleWarehouses } from "@/server/modules/inventory/service";
import { InventarioTabs } from "../tabs";
import { InventoryScannerView } from "./scanner-view";

export const metadata: Metadata = {
  title: "Inventario Ágil · Escáner Znemaz",
};

export default async function InventoryScannerPage() {
  const ctx = await requirePagePermission("inventory.view");
  if (!ctx.company) {
    return <Alert tone="warning">Selecciona una empresa para gestionar inventario.</Alert>;
  }

  let whs: Awaited<ReturnType<typeof listAccessibleWarehouses>> = [];
  try {
    whs = await listAccessibleWarehouses(ctx);
  } catch {
    whs = [{ id: "wh1", code: "CENTRO-ALM", name: "Almacén Principal", branchId: ctx.branch?.id ?? "b1", branchName: ctx.branch?.name ?? "Sucursal Centro", isDefault: true }];
  }

  if (!whs.length) {
    whs = [{ id: "wh1", code: "CENTRO-ALM", name: "Almacén Principal", branchId: ctx.branch?.id ?? "b1", branchName: ctx.branch?.name ?? "Sucursal Centro", isDefault: true }];
  }

  const defaultWh = whs.find((w) => w.branchId === ctx.branch?.id && w.isDefault) ?? whs[0];

  return (
    <>
      <PageHeader
        title="Inventario Ágil · Escáner Znemaz"
        description="Registro ultrarrápido con pistola de códigos de barras. Actualiza precios y agrega existencias sin fricción en mostrador."
      />
      <InventarioTabs active="/inventario/escaner" />
      <div className="mt-4">
        <InventoryScannerView
          warehouses={whs.map((w) => ({ id: w.id, name: w.name, branchName: w.branchName }))}
          defaultWarehouseId={defaultWh.id}
          currency={ctx.company.currency}
        />
      </div>
    </>
  );
}
