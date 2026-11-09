import type { Metadata } from "next";
import { Alert, PageHeader } from "@/components/ui";
import { requirePagePermission } from "@/server/context";
import { ComingSoonView } from "@/components/coming-soon";
import { InventarioTabs } from "../tabs";

export const metadata: Metadata = { title: "Traspasos" };

export default async function TransfersPage() {
  const ctx = await requirePagePermission("inventory.view");
  if (!ctx.company) return <Alert tone="warning">Selecciona una empresa.</Alert>;

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Traspasos entre almacenes y sucursales físicas."
      />
      <InventarioTabs active="/inventario/traspasos" />
      <ComingSoonView
        title="Traspasos de Mercancía"
        description="Transferencia y control logístico de existencias entre sucursales y bodegas centrales (salida con folio, control en tránsito y confirmación de recepción)."
        phase="Fase 4 · Cadena de Suministro"
      />
    </>
  );
}
