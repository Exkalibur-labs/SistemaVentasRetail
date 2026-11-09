import type { Metadata } from "next";
import { ComingSoonView } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Clientes · Próximamente" };

export default async function CustomersPage() {
  return (
    <ComingSoonView
      title="Clientes, Fidelización y Crédito"
      description="El módulo integral de directorio de clientes, líneas de crédito comercial, abonos en mostrador, monedero electrónico y puntos de fidelidad se encuentra en desarrollo activo."
      phase="Fase 4"
    />
  );
}
