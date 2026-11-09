import type { Metadata } from "next";
import { ComingSoonView } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Usuarios · Próximamente" };

export default async function UsersPage() {
  return (
    <ComingSoonView
      title="Usuarios y Control de Acceso"
      description="El alta masiva de cajeros, supervisores de piso y gerentes de sucursal con restricción por horarios y dispositivos se encuentra en desarrollo."
      phase="Fase 4"
    />
  );
}
