import { SectionTabs } from "@/components/section-tabs";

export function InventarioTabs({ active }: { active: string }) {
  return (
    <SectionTabs
      active={active}
      tabs={[
        { href: "/inventario", label: "Existencias" },
        { href: "/inventario/escaner", label: "⚡ Escáner Znemaz" },
        {
          href: "/inventario/traspasos",
          label: "Traspasos",
          disabled: true,
          tooltip: "Próximamente · Traspasos y transferencias de mercancía entre almacenes o sucursales físicas.",
        },
        {
          href: "/inventario/conteos",
          label: "Conteos físicos",
          disabled: true,
          tooltip: "Próximamente · Auditorías de inventario a ciegas y ajustes masivos por merma física.",
        },
      ]}
    />
  );
}
