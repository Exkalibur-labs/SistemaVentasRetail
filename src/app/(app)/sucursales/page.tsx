import type { Metadata } from "next";
import { ComingSoonView } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Sucursales · Próximamente" };

export default async function BranchesPage() {
  return (
    <ComingSoonView
      title="Sucursales y Puntos Físicos"
      description="El aprovisionamiento de nuevas sucursales físicas, bodegas periféricas y asignación de cajas registradoras independientes se encuentra en desarrollo."
      phase="Fase 4"
    />
  );
}
