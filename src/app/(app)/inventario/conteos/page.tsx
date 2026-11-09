import type { Metadata } from "next";
import { Alert, PageHeader } from "@/components/ui";
import { requirePagePermission } from "@/server/context";
import { ComingSoonView } from "@/components/coming-soon";
import { InventarioTabs } from "../tabs";

export const metadata: Metadata = { title: "Conteos físicos" };

export default async function CountsPage() {
  const ctx = await requirePagePermission("inventory.view");
  if (!ctx.company) return <Alert tone="warning">Selecciona una empresa.</Alert>;

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Conteos físicos y auditoría ciega de inventario."
      />
      <InventarioTabs active="/inventario/conteos" />
      <ComingSoonView
        title="Conteos Físicos de Inventario"
        description="Auditoría ciega en anaqueles, captura con pistola de código de barras y conciliación automática de diferencias y mermas."
        phase="Fase 4 · Auditoría y Control"
      />
    </>
  );
}
