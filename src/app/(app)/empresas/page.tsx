import type { Metadata } from "next";
import { ComingSoonView } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Empresas · Próximamente" };

export default async function CompaniesPage() {
  return (
    <ComingSoonView
      title="Empresas y Razón Social"
      description="La gestión avanzada de múltiples razones sociales bajo una misma cuenta corporativa, regímenes fiscales combinados y catálogos compartidos se encuentra en desarrollo."
      phase="Fase 4"
    />
  );
}
