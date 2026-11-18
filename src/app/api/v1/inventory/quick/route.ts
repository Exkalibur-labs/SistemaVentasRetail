import { z } from "zod";
import { withApi } from "@/server/api";
import { quickAddStock, quickCreateProductWithStock, quickScanLookup } from "@/server/modules/inventory/quick-service";
import { ValidationError } from "@/server/errors";
import { parseOrThrow } from "@/server/validation";

export const dynamic = "force-dynamic";

const quickInventoryBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_stock"),
    variantId: z.string().min(1, "variantId es requerido."),
    warehouseId: z.string().min(1, "warehouseId es requerido."),
    quantity: z.coerce.number().finite().positive("La cantidad debe ser mayor a cero."),
    unitPrice: z.coerce.number().finite().nonnegative().nullable().optional(),
    unitCost: z.coerce.number().finite().nonnegative().nullable().optional(),
    reason: z.string().max(240).optional(),
  }),
  z.object({
    action: z.literal("create_product"),
    barcode: z.string().trim().min(1, "El código de barras es requerido."),
    name: z.string().trim().min(1, "El nombre del producto es requerido."),
    price: z.coerce.number().finite().positive("El precio debe ser mayor a cero."),
    quantity: z.coerce.number().finite().nonnegative().optional().default(0),
    cost: z.coerce.number().finite().nonnegative().nullable().optional(),
    categoryName: z.string().max(120).optional(),
    warehouseId: z.string().min(1).optional(),
  }),
]);

/** Búsqueda rápida por código de barras o SKU */
export const GET = withApi(async (req, ctx) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const warehouseId = url.searchParams.get("warehouseId") || undefined;

  if (!q) {
    throw new ValidationError({ q: ["El término de búsqueda (código de barras o SKU) es obligatorio."] });
  }

  const result = await quickScanLookup(ctx, q, warehouseId);
  return { ok: true, ...result };
});

/** Entrada rápida de stock o alta rápida de producto escaneado */
export const POST = withApi(async (req, ctx) => {
  const input = parseOrThrow(quickInventoryBodySchema, await req.json());

  if (input.action === "add_stock") {
    const res = await quickAddStock(ctx, {
      variantId: input.variantId,
      warehouseId: input.warehouseId,
      quantity: input.quantity,
      unitPrice: input.unitPrice ?? undefined,
      unitCost: input.unitCost ?? undefined,
      reason: input.reason,
    });
    return { ok: true, ...res };
  }

  const res = await quickCreateProductWithStock(ctx, {
    barcode: input.barcode,
    name: input.name,
    price: input.price,
    quantity: input.quantity,
    cost: input.cost ?? null,
    categoryName: input.categoryName,
    warehouseId: input.warehouseId,
  });
  return { ok: true, ...res };
});
