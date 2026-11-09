import type { Metadata } from "next";
import { ComingSoonView } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Promociones · Próximamente" };

export default async function PromotionsPage() {
  return (
    <ComingSoonView
      title="Promociones y Descuentos Dinámicos"
      description="El motor de combos (ej. Sabritas + Coca-Cola), descuentos porcentuales por volumen, ofertas 2x1 y cupones de fidelización con aplicación automática en punto de venta se encuentra en desarrollo."
      phase="Fase 4"
    />
  );
}
