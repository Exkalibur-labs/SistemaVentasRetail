import type { Metadata } from "next";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
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

  const whs = await listAccessibleWarehouses(ctx);
  if (!whs.length) {
    return (
      <EmptyState
        title="No tienes almacenes disponibles"
        description="Solicita acceso a una sucursal con almacén configurado."
      />
    );
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
