import type { Metadata } from "next";
import { ComingSoonView } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Plataforma · Próximamente" };

export default async function PlatformPage() {
  return (
    <ComingSoonView
      title="Consola de Plataforma Multi-Tenant"
      description="La consola centralizada para provisionar organizaciones, dominios personalizados, límites de suscripción y métricas globales del ecosistema retail está programada para la siguiente fase."
      phase="Fase 5"
    />
  );
}
