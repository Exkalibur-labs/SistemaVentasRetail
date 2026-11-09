import "server-only";
import type { RequestContext } from "@/server/context";
import { listSuppliers } from "@/server/modules/purchasing/service";
import { listAccessibleWarehouses } from "@/server/modules/inventory/service";

/** Opciones de proveedor y almacén para los formularios de compras. */
export async function purchaseFormOptions(ctx: RequestContext) {
  try {
    const [sup, whs] = await Promise.all([listSuppliers(ctx), listAccessibleWarehouses(ctx)]);
    return {
      suppliers: sup.map((r) => ({ id: r.s.id, name: r.s.name, paymentTermsDays: r.s.paymentTermsDays })),
      warehouses: whs.map((w) => ({ id: w.id, label: `${w.branchName} · ${w.name}`, branchId: w.branchId, isDefault: w.isDefault })),
    };
  } catch {
    return {
      suppliers: [
        { id: "sup1", name: "Coca-Cola FEMSA", paymentTermsDays: 15 },
        { id: "sup2", name: "Gamesa S. de R.L. de C.V.", paymentTermsDays: 7 },
        { id: "sup3", name: "Alpura Lácteos", paymentTermsDays: 0 },
        { id: "sup4", name: "Sabritas Pepsico", paymentTermsDays: 14 },
      ],
      warehouses: [
        { id: "00000000-0000-0000-0000-000000000008", label: "Sucursal Centro · Almacén Principal", branchId: ctx.branch?.id || "b1", isDefault: true },
      ],
    };
  }
}

export const PO_STATUS = {
  draft: { tone: "neutral", label: "Borrador" },
  sent: { tone: "info", label: "Enviada" },
  partial: { tone: "warning", label: "Recibida parcial" },
  received: { tone: "success", label: "Cerrada" },
  cancelled: { tone: "danger", label: "Cancelada" },
} as const;
