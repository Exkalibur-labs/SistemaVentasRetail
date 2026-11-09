import { withApi } from "@/server/api";
import { quickAddStock, quickCreateProductWithStock, quickScanLookup } from "@/server/modules/inventory/quick-service";
import { ValidationError } from "@/server/errors";

export const dynamic = "force-dynamic";

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
  const body = await req.json();
  const { action } = body;

  if (action === "add_stock") {
    const res = await quickAddStock(ctx, {
      variantId: body.variantId,
      warehouseId: body.warehouseId,
      quantity: Number(body.quantity),
      unitPrice: body.unitPrice !== undefined && body.unitPrice !== null ? Number(body.unitPrice) : undefined,
      unitCost: body.unitCost !== undefined && body.unitCost !== null ? Number(body.unitCost) : undefined,
      reason: body.reason,
    });
    return { ok: true, ...res };
  }

  if (action === "create_product") {
    const res = await quickCreateProductWithStock(ctx, {
      barcode: body.barcode,
      name: body.name,
      price: Number(body.price),
      quantity: body.quantity !== undefined ? Number(body.quantity) : 0,
      cost: body.cost !== undefined && body.cost !== null ? Number(body.cost) : null,
      categoryName: body.categoryName,
      warehouseId: body.warehouseId,
    });
    return { ok: true, ...res };
  }

  throw new ValidationError({ action: ["Acción no válida. Se esperaba 'add_stock' o 'create_product'."] });
});
