import type { Metadata } from "next";
import { ComingSoonView } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Bitácora de Auditoría · Próximamente" };

export default async function AuditLogPage() {
  return (
    <ComingSoonView
      title="Bitácora Forense e Inmutable"
      description="El visor forense detallado con filtros avanzados de IP, huella de dispositivo y registros criptográficos inmutables de auditoría se encuentra en desarrollo."
      phase="Fase 4"
    />
  );
}
