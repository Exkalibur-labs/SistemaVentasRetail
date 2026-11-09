import type { Metadata } from "next";
import { ComingSoonView } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Roles y Permisos · Próximamente" };

export default async function RolesPage() {
  return (
    <ComingSoonView
      title="Roles y Seguridad Granular"
      description="La personalización de la matriz RBAC de 67 permisos atómicos para otorgar facultades específicas de cobro, descuentos, cancelaciones y arqueos se encuentra en desarrollo."
      phase="Fase 4"
    />
  );
}
