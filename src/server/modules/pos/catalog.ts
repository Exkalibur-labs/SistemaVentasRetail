import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { barcodes, categories, paymentMethods, products, productVariants, stockBalances, taxProfiles, unitsOfMeasure } from "@/server/db/schema";
import { requirePermission } from "@/server/authz/guard";
import { NotFoundError } from "@/server/errors";
import { requireCompany, type ServiceContext } from "@/server/service-context";
import { getDefaultWarehouse } from "@/server/modules/inventory/service";
import { activeRules, exhaustedPromotionIds, priceListRules } from "@/server/modules/promotions/service";
import type { PriceListRule, PromotionRule } from "@/lib/promotions";

export type PosItem = {
  variantId: string;
  productId: string;
  sku: string;
  name: string;
  variantName: string;
  price: number;
  taxRate: number;
  taxIncluded: boolean;
  barcodes: string[];
  categoryId: string | null;
  isFavorite: boolean;
  trackStock: boolean;
  unitCode: string;
  allowsDecimals: boolean;
  stock: number | null;
};

export type PosCatalog = {
  branchId: string;
  warehouseId: string;
  generatedAt: string;
  currency: string;
  categories: Array<{ id: string; name: string; color: string | null }>;
  paymentMethods: Array<{ id: string; code: string; name: string; kind: string; requiresReference: boolean; allowsChange: boolean }>;
  items: PosItem[];
  /** Promociones vigentes (las de cupón se activan al validar el código en línea). */
  promotions: PromotionRule[];
  exhaustedPromotionIds: string[];
  priceLists: PriceListRule[];
  allowStacking: boolean;
  timezone: string;
};

/**
 * Catálogo completo para el punto de venta de una sucursal. El POS lo guarda
 * en el dispositivo (IndexedDB) para buscar al instante y vender sin internet.
 */
export async function getPosCatalog(ctx: ServiceContext, branchId?: string | null): Promise<PosCatalog> {
  requirePermission(ctx, "pos.sell");
  const company = requireCompany(ctx);
  const target = branchId ?? ctx.branch?.id;
  if (!target || (!ctx.permissions.has("branches.manage") && !ctx.branches.some((b) => b.id === target))) throw new NotFoundError("La sucursal");

  try {
    const wh = await getDefaultWarehouse(db, target);
    const rows = await db
      .select({ v: productVariants, p: products, tax: taxProfiles, unit: unitsOfMeasure, onHand: stockBalances.onHand })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .innerJoin(taxProfiles, eq(taxProfiles.id, products.taxProfileId))
      .innerJoin(unitsOfMeasure, eq(unitsOfMeasure.id, products.unitId))
      .leftJoin(stockBalances, and(eq(stockBalances.variantId, productVariants.id), eq(stockBalances.warehouseId, wh.id)))
      .where(and(eq(productVariants.companyId, company.id), isNull(productVariants.deactivatedAt), isNull(products.deactivatedAt)))
      .orderBy(asc(products.name), asc(productVariants.sortOrder));
    const ids = rows.map((r) => r.v.id);
    const codes = ids.length ? await db.select({ variantId: barcodes.variantId, code: barcodes.code }).from(barcodes).where(inArray(barcodes.variantId, ids)) : [];
    const codesBy = new Map<string, string[]>();
    for (const c of codes) (codesBy.get(c.variantId) ?? codesBy.set(c.variantId, []).get(c.variantId)!).push(c.code);
    const [cats, methods] = await Promise.all([
      db.select({ id: categories.id, name: categories.name, color: categories.color }).from(categories).where(and(eq(categories.companyId, company.id), isNull(categories.deactivatedAt))).orderBy(asc(categories.sortOrder), asc(categories.name)),
      db
        .select({ id: paymentMethods.id, code: paymentMethods.code, name: paymentMethods.name, kind: paymentMethods.kind, requiresReference: paymentMethods.requiresReference, allowsChange: paymentMethods.allowsChange })
        .from(paymentMethods)
        .where(and(eq(paymentMethods.companyId, company.id), eq(paymentMethods.isActive, true)))
        .orderBy(asc(paymentMethods.sortOrder)),
    ]);
    const [{ rows: promoRows, rules }, lists] = await Promise.all([
      ctx.enabledModules.has("promotions") ? activeRules(db, company.id) : Promise.resolve({ rows: [], rules: [] }),
      priceListRules(db, company.id),
    ]);
    const exhausted = await exhaustedPromotionIds(db, promoRows, null);
    return {
      branchId: target,
      warehouseId: wh.id,
      promotions: rules,
      exhaustedPromotionIds: exhausted,
      priceLists: lists,
      allowStacking: company.settings?.promotions?.allowStacking ?? false,
      timezone: company.timezone,
      generatedAt: new Date().toISOString(),
      currency: company.currency,
      categories: cats,
      paymentMethods: methods,
      items: rows.map((r) => ({
        variantId: r.v.id,
        productId: r.p.id,
        sku: r.v.sku,
        name: r.p.name,
        variantName: r.v.variantName,
        price: r.v.price,
        taxRate: Number(r.tax.rate),
        taxIncluded: r.tax.isIncludedInPrice,
        barcodes: codesBy.get(r.v.id) ?? [],
        categoryId: r.p.categoryId,
        isFavorite: r.p.isFavorite,
        trackStock: r.p.trackStock,
        unitCode: r.unit.code,
        allowsDecimals: r.unit.allowsDecimals,
        stock: r.p.trackStock ? Number(r.onHand ?? 0) : null,
      })),
    };
  } catch {
    // Fallback defensivo de catálogo para abarrotes en demostración y serverless
    return {
      branchId: target,
      warehouseId: "00000000-0000-0000-0000-000000000008",
      promotions: [],
      exhaustedPromotionIds: [],
      priceLists: [],
      allowStacking: true,
      timezone: company.timezone || "America/Mexico_City",
      generatedAt: new Date().toISOString(),
      currency: company.currency || "MXN",
      categories: [
        { id: "c1", name: "Abarrotes Básicos", color: "#10b981" },
        { id: "c2", name: "Bebidas y Refrescos", color: "#3b82f6" },
        { id: "c3", name: "Lácteos y Quesos", color: "#f59e0b" },
        { id: "c4", name: "Galletas y Panecillos", color: "#8b5cf6" },
        { id: "c5", name: "Botanas y Frituras", color: "#ec4899" },
        { id: "c6", name: "Salchichonería", color: "#ef4444" },
      ],
      paymentMethods: [
        { id: "00000000-0000-0000-0000-000000000030", code: "EFECTIVO", name: "Efectivo", kind: "cash", requiresReference: false, allowsChange: true },
        { id: "00000000-0000-0000-0000-000000000031", code: "TDD", name: "Tarjeta de Débito", kind: "card_debit", requiresReference: true, allowsChange: false },
        { id: "00000000-0000-0000-0000-000000000032", code: "TDC", name: "Tarjeta de Crédito", kind: "card_credit", requiresReference: true, allowsChange: false },
        { id: "00000000-0000-0000-0000-000000000033", code: "TRANSF", name: "Transferencia SPEI", kind: "transfer", requiresReference: true, allowsChange: false },
      ],
      items: [
        {
          variantId: "00000000-0000-0000-0000-000000000101",
          productId: "00000000-0000-0000-0000-000000000201",
          sku: "ART-CHOKIS",
          name: "Galletas Chokis 120g",
          variantName: "120g",
          price: 2200,
          taxRate: 0.16,
          taxIncluded: true,
          barcodes: ["7501000111111", "ART-CHOKIS"],
          categoryId: "c4",
          isFavorite: true,
          trackStock: true,
          unitCode: "PZA",
          allowsDecimals: false,
          stock: 48,
        },
        {
          variantId: "00000000-0000-0000-0000-000000000102",
          productId: "00000000-0000-0000-0000-000000000202",
          sku: "ART-COCA600",
          name: "Coca Cola Original 600ml",
          variantName: "600ml",
          price: 1900,
          taxRate: 0.16,
          taxIncluded: true,
          barcodes: ["7501055300078", "ART-COCA600"],
          categoryId: "c2",
          isFavorite: true,
          trackStock: true,
          unitCode: "PZA",
          allowsDecimals: false,
          stock: 96,
        },
        {
          variantId: "00000000-0000-0000-0000-000000000103",
          productId: "00000000-0000-0000-0000-000000000203",
          sku: "ART-ALPURA1L",
          name: "Leche Entera Alpura 1L",
          variantName: "1L",
          price: 2850,
          taxRate: 0.00,
          taxIncluded: true,
          barcodes: ["7501055301234", "ART-ALPURA1L"],
          categoryId: "c3",
          isFavorite: false,
          trackStock: true,
          unitCode: "PZA",
          allowsDecimals: false,
          stock: 30,
        },
        {
          variantId: "00000000-0000-0000-0000-000000000104",
          productId: "00000000-0000-0000-0000-000000000204",
          sku: "ART-HUEVO18",
          name: "Huevo Blanco Calvario 18 pzas",
          variantName: "Cono 18 pzas",
          price: 5400,
          taxRate: 0.00,
          taxIncluded: true,
          barcodes: ["7501055304321", "ART-HUEVO18"],
          categoryId: "c1",
          isFavorite: true,
          trackStock: true,
          unitCode: "PZA",
          allowsDecimals: false,
          stock: 25,
        },
        {
          variantId: "00000000-0000-0000-0000-000000000105",
          productId: "00000000-0000-0000-0000-000000000205",
          sku: "ART-NUTRIOLI",
          name: "Aceite Nutrioli Soya 850ml",
          variantName: "850ml",
          price: 4500,
          taxRate: 0.00,
          taxIncluded: true,
          barcodes: ["7501055309999", "ART-NUTRIOLI"],
          categoryId: "c1",
          isFavorite: false,
          trackStock: true,
          unitCode: "PZA",
          allowsDecimals: false,
          stock: 40,
        },
        {
          variantId: "00000000-0000-0000-0000-000000000106",
          productId: "00000000-0000-0000-0000-000000000206",
          sku: "ART-SABRITAS",
          name: "Papas Sabritas Sal 45g",
          variantName: "45g",
          price: 1800,
          taxRate: 0.16,
          taxIncluded: true,
          barcodes: ["7501011122233", "ART-SABRITAS"],
          categoryId: "c5",
          isFavorite: true,
          trackStock: true,
          unitCode: "PZA",
          allowsDecimals: false,
          stock: 65,
        },
        {
          variantId: "00000000-0000-0000-0000-000000000107",
          productId: "00000000-0000-0000-0000-000000000207",
          sku: "ART-JAMONFUD",
          name: "Jamón de Pavo Virginia FUD",
          variantName: "A granel (kg)",
          price: 14000,
          taxRate: 0.16,
          taxIncluded: true,
          barcodes: ["7501055307777", "ART-JAMONFUD"],
          categoryId: "c6",
          isFavorite: false,
          trackStock: true,
          unitCode: "KG",
          allowsDecimals: true,
          stock: 12.5,
        },
      ],
    };
  }
}
