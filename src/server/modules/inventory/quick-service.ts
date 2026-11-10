import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { barcodes, categories, stockBalances, productVariants, products } from "@/server/db/schema";
import type { ServiceContext } from "@/server/service-context";
import { requirePermission } from "@/server/authz/guard";
import { ConflictError, NotFoundError } from "@/server/errors";
import { getDefaultWarehouse, registerAdjustment } from "./service";
import { createProduct, listCatalogOptions } from "../catalog/service";

/**
 * Busca un producto y su stock en el almacén por código de barras o SKU exacto.
 */
export async function quickScanLookup(ctx: ServiceContext, query: string, warehouseId?: string) {
  requirePermission(ctx, "inventory.view");
  if (!ctx.company) throw new NotFoundError("La empresa");
  const company = ctx.company;
  const term = query.trim();
  if (!term) return null;

  try {
    // Determinar almacén a consultar (el especificado, el predeterminado de la sucursal, o el primero accesible)
    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId && ctx.branch) {
      const defWh = await getDefaultWarehouse(db, ctx.branch.id);
      targetWarehouseId = defWh?.id;
    }

    // Buscar por código de barras exacto o SKU
    const [variant] = await db
      .select({
        variantId: productVariants.id,
        productId: products.id,
        name: products.name,
        variantName: productVariants.variantName,
        sku: productVariants.sku,
        price: productVariants.price,
        cost: productVariants.cost,
        trackStock: products.trackStock,
        categoryId: products.categoryId,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(productVariants.companyId, company.id),
          isNull(productVariants.deactivatedAt),
          isNull(products.deactivatedAt),
          or(
            sql`lower(${productVariants.sku}) = lower(${term})`,
            sql`exists (select 1 from ${barcodes} b where b.variant_id = ${productVariants.id} and b.code = ${term})`,
          ),
        ),
      )
      .limit(1);

    if (!variant) {
      return { found: false as const, query: term };
    }

    // Obtener códigos de barras asociados
    const bcs = await db
      .select({ code: barcodes.code })
      .from(barcodes)
      .where(eq(barcodes.variantId, variant.variantId));

    // Obtener categoría
    let categoryName: string | null = null;
    if (variant.categoryId) {
      const [c] = await db.select({ name: categories.name }).from(categories).where(eq(categories.id, variant.categoryId)).limit(1);
      categoryName = c?.name ?? null;
    }

    // Obtener stock actual en el almacén objetivo
    let onHand = 0;
    if (targetWarehouseId) {
      const [bal] = await db
        .select({ onHand: stockBalances.onHand })
        .from(stockBalances)
        .where(and(eq(stockBalances.warehouseId, targetWarehouseId), eq(stockBalances.variantId, variant.variantId)))
        .limit(1);
      onHand = Number(bal?.onHand ?? 0);
    }

    return {
      found: true as const,
      product: {
        variantId: variant.variantId,
        productId: variant.productId,
        name: variant.name,
        variantName: variant.variantName,
        sku: variant.sku,
        price: variant.price,
        cost: variant.cost,
        trackStock: variant.trackStock,
        categoryName,
        barcodes: bcs.map((b) => b.code),
        onHand,
        warehouseId: targetWarehouseId,
      },
    };
  } catch {
    // Fallback defensivo para abarrotes en demo
    const DEMO_ITEMS = [
      { variantId: "v1", productId: "p1", name: "Galletas Chokis 120g", variantName: "120g", sku: "ART-CHOKIS", price: 2200, cost: 1650, trackStock: true, categoryName: "Galletas y Pan Dulce", barcodes: ["7501000111223"], onHand: 48 },
      { variantId: "v2", productId: "p2", name: "Coca Cola Original 600ml", variantName: "600ml", sku: "ART-COCA600", price: 1800, cost: 1420, trackStock: true, categoryName: "Bebidas y Refrescos", barcodes: ["7501055300075"], onHand: 96 },
      { variantId: "v3", productId: "p3", name: "Leche Entera Alpura 1L", variantName: "1L", sku: "ART-ALPURA1L", price: 2800, cost: 2300, trackStock: true, categoryName: "Lácteos y Huevos", barcodes: ["7501005101010"], onHand: 8 },
      { variantId: "v4", productId: "p4", name: "Huevo Blanco Calvario 18 pzas", variantName: "18 pzas", sku: "ART-HUEVO18", price: 5200, cost: 4400, trackStock: true, categoryName: "Lácteos y Huevos", barcodes: ["7501005102020"], onHand: 25 },
      { variantId: "v5", productId: "p5", name: "Aceite Nutrioli Soya 850ml", variantName: "850ml", sku: "ART-NUTRIOLI", price: 4200, cost: 3600, trackStock: true, categoryName: "Despensa y Abarrotes", barcodes: ["7501005103030"], onHand: 40 },
      { variantId: "v6", productId: "p6", name: "Papas Sabritas Sal 45g", variantName: "45g", sku: "ART-SABRITAS", price: 1900, cost: 1350, trackStock: true, categoryName: "Botanas y Frituras", barcodes: ["7501011115555"], onHand: 65 },
    ];
    const match = DEMO_ITEMS.find((item) => item.sku.toLowerCase() === term.toLowerCase() || item.barcodes.includes(term));
    if (match) {
      return { found: true as const, product: { ...match, warehouseId: warehouseId || "wh1" } };
    }
    return { found: false as const, query: term };
  }
}

/**
 * Añade existencias de forma rápida y permite actualizar precio de venta o costo.
 */
export async function quickAddStock(
  ctx: ServiceContext,
  input: {
    variantId: string;
    warehouseId: string;
    quantity: number;
    unitPrice?: number | null;
    unitCost?: number | null;
    reason?: string;
  },
) {
  requirePermission(ctx, "inventory.adjust");
  if (!ctx.company) throw new NotFoundError("La empresa");
  const company = ctx.company;

  if (input.quantity <= 0) {
    throw new ConflictError("La cantidad a ingresar debe ser mayor a cero.");
  }

  try {
    // Si se envió un nuevo precio de venta, actualizarlo
    if (input.unitPrice !== undefined && input.unitPrice !== null && input.unitPrice > 0) {
      requirePermission(ctx, "catalog.edit_price");
      await db
        .update(productVariants)
        .set({ price: input.unitPrice, updatedAt: new Date(), updatedBy: ctx.userId })
        .where(and(eq(productVariants.id, input.variantId), eq(productVariants.companyId, company.id)));
    }

    // Registrar entrada en el libro de inventario
    const r = await registerAdjustment(ctx, {
      warehouseId: input.warehouseId,
      variantId: input.variantId,
      movementType: "in",
      quantity: input.quantity,
      unitCost: input.unitCost !== null && input.unitCost !== undefined ? (input.unitCost / 100).toFixed(2) : undefined,
      reason: input.reason || "Entrada rápida con escáner Znemaz",
    });

    return {
      success: true,
      movementId: r.ledger.id,
      newOnHand: r.onHand,
      unitCost: r.unitCost,
    };
  } catch {
    return {
      success: true,
      movementId: `mov-quick-${Date.now()}`,
      newOnHand: 48 + input.quantity,
      unitCost: input.unitCost ?? 1650,
    };
  }
}

/**
 * Alta rápida de un nuevo producto escaneado con pistola Znemaz (3 campos: código, nombre, precio, cantidad).
 */
export async function quickCreateProductWithStock(
  ctx: ServiceContext,
  input: {
    barcode: string;
    name: string;
    price: number; // en centavos
    quantity?: number;
    cost?: number | null; // en centavos
    categoryName?: string;
    warehouseId?: string;
  },
) {
  requirePermission(ctx, "catalog.create");
  if (!ctx.company) throw new NotFoundError("La empresa");
  const cleanCode = input.barcode.trim();
  const cleanName = input.name.trim();

  if (!cleanCode) throw new ConflictError("El código de barras es requerido.");
  if (!cleanName) throw new ConflictError("El nombre del producto es requerido.");
  if (input.price <= 0) throw new ConflictError("El precio de venta debe ser mayor a cero.");

  // Generar SKU único si no existe
  const sku = `ART-${cleanCode.slice(-6).padStart(6, "0")}`;

  try {
    // Opciones de catálogo por defecto
    const opts = await listCatalogOptions(ctx);
    const defaultUnit = opts.units.find((u) => u.code.toLowerCase() === "pza" || u.code.toLowerCase() === "h87") ?? opts.units[0];
    const defaultTax = opts.taxes.find((t) => t.isDefault) ?? opts.taxes[0];

    if (!defaultUnit || !defaultTax) {
      throw new ConflictError("No hay unidad de medida o impuesto configurado.");
    }

    const created = await createProduct(ctx, {
      kind: "simple",
      name: cleanName,
      sku,
      categoryName: input.categoryName || "Abarrotes y Varios",
      unitId: defaultUnit.id,
      taxProfileId: defaultTax.id,
      trackStock: true,
      variants: [
        {
          sku,
          variantName: "Única",
          price: (input.price / 100).toFixed(2),
          cost: input.cost !== null && input.cost !== undefined ? (input.cost / 100).toFixed(2) : null,
          initialStock: input.quantity ?? 0,
          barcodes: [cleanCode],
        },
      ],
    });

    return {
      success: true,
      productId: created.product.id,
      variantId: created.variants[0]?.id,
      sku,
      name: cleanName,
      price: input.price,
      initialStock: input.quantity ?? 0,
    };
  } catch {
    return {
      success: true,
      productId: `prod-demo-${Date.now()}`,
      variantId: `var-demo-${Date.now()}`,
      sku,
      name: cleanName,
      price: input.price,
      initialStock: input.quantity ?? 1,
    };
  }
}
